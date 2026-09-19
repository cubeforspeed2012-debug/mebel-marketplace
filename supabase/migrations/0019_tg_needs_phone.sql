-- Нужно ли сразу после привязки просить номер.
--
-- Мастер только что зарегистрировался, завёл мастерскую и подключил
-- Telegram. Просить его отдельно нажать ещё одну кнопку «Подтвердить
-- номер» — значит потерять почти всех: до второго шага не доходят.
-- Поэтому бот спрашивает номер сразу же, в том же разговоре, но только
-- если есть что подтверждать: номер указан и ещё не подтверждён.
--
-- Возвращаем один да/нет и ничего больше: обработчик Telegram ходит
-- в базу как гость, и телефон ему знать незачем.
create or replace function public.tg_needs_phone(p_chat_id text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
      from public.companies c
     where c.telegram_chat_id = p_chat_id
       and c.phone_verified is not true
       and length(public.phone_tail(c.phone_public)) = 9
  )
$function$;

revoke all on function public.tg_needs_phone(text) from public;
grant execute on function public.tg_needs_phone(text) to anon, authenticated;
