-- Подтверждение номера кодом от самого Telegram.
--
-- Как у Яндекса и банков: человек нажимает «Получить код», и Telegram
-- присылает его в официальный чат «Verification Codes» (с синей галочкой)
-- на тот номер, что указан в мастерской. Не нужно открывать нашего бота
-- и нажимать «Поделиться номером» — хватит ввести цифры на сайте.
--
-- Код проверяет Telegram, а не мы. Наш сервер спрашивает у него «верен ли
-- код по этой отправке» и получает в ответ номер, на который код ушёл.
-- Только тогда он зовёт функцию ниже. Сам мастер позвать её не может:
-- она требует служебный секрет сервера (тот же, что у автопроверки работ,
-- лежит в app_secrets и в секретах Cloudflare, а не в коде).

-- Каждая отправка кода стоит денег, поэтому считаем их: не чаще раза
-- в минуту и не больше пяти в сутки на человека.
create table if not exists public.phone_code_sends (
  id      bigserial primary key,
  user_id uuid not null,
  sent_at timestamptz not null default now()
);
create index if not exists phone_code_sends_user_idx
  on public.phone_code_sends (user_id, sent_at desc);
alter table public.phone_code_sends enable row level security;

create or replace function public.phone_code_allowed()
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return 'no_user';
  end if;

  if exists (select 1 from public.phone_code_sends
              where user_id = v_uid and sent_at > now() - interval '60 seconds') then
    return 'wait';
  end if;

  if (select count(*) from public.phone_code_sends
       where user_id = v_uid and sent_at > now() - interval '1 day') >= 5 then
    return 'limit';
  end if;

  insert into public.phone_code_sends (user_id) values (v_uid);
  return 'ok';
end;
$function$;

revoke all on function public.phone_code_allowed() from public;
grant execute on function public.phone_code_allowed() to authenticated;

create or replace function public.verify_phone_by_gateway(p_secret text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_expected text;
  v_uid      uuid := auth.uid();
  v_id       bigint;
  v_stored   text;
  v_checked  text := public.phone_tail(p_phone);
begin
  select value into v_expected from public.app_secrets where name = 'ai_moderation';
  if v_expected is null or coalesce(p_secret, '') = '' then
    return jsonb_build_object('status', 'not_configured');
  end if;
  if p_secret <> v_expected then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if v_uid is null or length(v_checked) < 9 then
    return jsonb_build_object('status', 'bad_input');
  end if;

  select c.id, public.phone_tail(c.phone_public)
    into v_id, v_stored
    from public.companies c
   where c.owner_user_id = v_uid
   order by c.id
   limit 1;

  if v_id is null then
    return jsonb_build_object('status', 'no_company');
  end if;

  -- Код пришёл на один номер, а в мастерской уже другой (мастер успел
  -- поменять) — галочку не ставим: она обязана относиться к показанному.
  if v_stored is distinct from v_checked then
    return jsonb_build_object('status', 'mismatch');
  end if;

  perform set_config('app.phone', 'verify', true);
  update public.companies set phone_verified = true where id = v_id;
  perform set_config('app.phone', '', true);

  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.verify_phone_by_gateway(text, text) from public;
grant execute on function public.verify_phone_by_gateway(text, text) to authenticated;
