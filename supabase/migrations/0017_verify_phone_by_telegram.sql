-- Подтверждение номера мастера через Telegram.
--
-- Раньше мастер вписывал в профиль любой номер, и никто его не проверял:
-- можно было указать чужой или номер конкурента. Теперь галочку
-- «номер подтверждён» ставит не человек, а Telegram: мастер нажимает
-- встроенную кнопку «Поделиться номером», и Telegram сам присылает нам
-- тот номер, на который зарегистрирован его аккаунт.
--
-- Совпал с номером в мастерской — ставим галочку. Не совпал — не ставим
-- и ничего не перезаписываем: подтвердить можно только свой номер,
-- а какой показывать клиентам, мастер решает сам.

-- Оставляем от номера только цифры и берём последние девять: мастер мог
-- записать «+998 90 123-45-67», а Telegram присылает «998901234567».
create or replace function public.phone_tail(p_phone text)
returns text
language sql
immutable
as $function$
  select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9)
$function$;

create or replace function public.verify_phone_by_telegram(p_chat_id text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id      bigint;
  v_name    text;
  v_stored  text;
  v_shared  text := public.phone_tail(p_phone);
begin
  if length(v_shared) < 9 or coalesce(p_chat_id, '') = '' then
    return jsonb_build_object('status', 'bad_input');
  end if;

  -- Чат уже привязан к мастерской — по нему и узнаём, чей это номер.
  -- Без привязки подтверждать нечего: мы не знаем, кто пишет.
  select c.id, c.name, public.phone_tail(c.phone_public)
    into v_id, v_name, v_stored
    from public.companies c
   where c.telegram_chat_id = p_chat_id
   limit 1;

  if v_id is null then
    return jsonb_build_object('status', 'not_linked');
  end if;

  if length(v_stored) < 9 then
    return jsonb_build_object('status', 'no_phone', 'company', v_name);
  end if;

  if v_stored <> v_shared then
    return jsonb_build_object(
      'status', 'mismatch',
      'company', v_name,
      'stored_tail', right(v_stored, 4),
      'shared_tail', right(v_shared, 4)
    );
  end if;

  perform set_config('app.phone', 'verify', true);
  update public.companies set phone_verified = true where id = v_id;

  return jsonb_build_object('status', 'ok', 'company', v_name);
end;
$function$;

-- Зовёт эту функцию наш обработчик Telegram, а он ходит в базу как гость.
-- Подтвердить чужую мастерскую так нельзя: нужно одновременно знать
-- её telegram-чат и её же номер — а совпадение номера означает, что
-- утверждение и так верное.
revoke all on function public.verify_phone_by_telegram(text, text) from public;
grant execute on function public.verify_phone_by_telegram(text, text) to anon, authenticated;
revoke all on function public.phone_tail(text) from public;
grant execute on function public.phone_tail(text) to anon, authenticated;
