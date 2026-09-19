-- Обращения в поддержку.
--
-- Первым отвечает помощник на ИИ: он знает, как устроен сайт, и закрывает
-- типовые вопросы сразу. Если не справился — человек нажимает «Позвать
-- администратора», и весь разговор целиком ложится сюда: администратору
-- не нужно переспрашивать, что случилось, он читает переписку и отвечает.
create table if not exists public.support_tickets (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete set null,
  contact     text,                      -- почта или телефон, куда ответить
  page        text,                      -- откуда пришёл человек
  transcript  jsonb not null default '[]'::jsonb,
  status      text not null default 'open' check (status in ('open', 'done')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists support_tickets_open_idx
  on public.support_tickets (status, created_at desc);

alter table public.support_tickets enable row level security;

-- Читает и закрывает только администратор. Автор своего обращения
-- не видит — отвечаем ему по контакту, который он оставил.
create policy "admin reads support tickets"
  on public.support_tickets for select to authenticated
  using (public.is_admin());

create policy "admin updates support tickets"
  on public.support_tickets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Создаёт обращение функция, а не прямая вставка: так гость (у которого
-- как раз чаще всего и не получается войти) тоже может позвать на помощь,
-- а размер и число сообщений мы держим в руках.
create or replace function public.create_support_ticket(
  p_contact text,
  p_page text,
  p_transcript jsonb
)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id bigint;
begin
  if jsonb_typeof(p_transcript) <> 'array' or jsonb_array_length(p_transcript) = 0 then
    raise exception 'Пустое обращение';
  end if;
  if jsonb_array_length(p_transcript) > 40 or length(p_transcript::text) > 20000 then
    raise exception 'Слишком длинное обращение';
  end if;

  insert into public.support_tickets (user_id, contact, page, transcript)
  values (auth.uid(), left(coalesce(p_contact, ''), 200), left(coalesce(p_page, ''), 200), p_transcript)
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.create_support_ticket(text, text, jsonb) from public;
grant execute on function public.create_support_ticket(text, text, jsonb) to anon, authenticated;
