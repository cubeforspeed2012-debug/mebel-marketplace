-- Заявки в Telegram: недостающая половина.
--
-- Отправка сообщений была написана давно, но мастер не мог сказать, КУДА
-- слать: поля telegram_chat_id никто не заполнял, и уведомления просто
-- никогда не уходили.
--
-- Как теперь. Мастер в кабинете нажимает «Подключить» — база выдаёт
-- одноразовый код на 15 минут. Мастер открывает бота по ссылке
-- t.me/бот?start=код и жмёт Start. Telegram зовёт наш адрес, тот передаёт
-- код и номер чата сюда, и чат привязывается к мастерской.
--
-- Почему код короткоживущий: подобранный чужой код дал бы доступ к заявкам
-- мастера вместе с телефонами его клиентов. 32 знака случайности за 15
-- минут не подобрать.

alter table public.companies
  add column if not exists telegram_link_code    text,
  add column if not exists telegram_link_expires timestamptz;

create unique index if not exists companies_tg_code_idx
  on public.companies (telegram_link_code)
  where telegram_link_code is not null;

-- Сторож служебных полей теперь бережёт и привязку Telegram. Функции ниже
-- поднимают флаг на время своей транзакции — обычная правка профиля его
-- не поднимает, поэтому вписать чат руками нельзя.
create or replace function public.guard_company_admin_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.status         := old.status;
  new.boosted_until  := old.boosted_until;
  new.phone_verified := old.phone_verified;
  new.owner_user_id  := old.owner_user_id;

  if coalesce(current_setting('app.telegram', true), '') <> 'link' then
    new.telegram_chat_id      := old.telegram_chat_id;
    new.telegram_link_code    := old.telegram_link_code;
    new.telegram_link_expires := old.telegram_link_expires;
  end if;

  return new;
end;
$$;

-- Мастер просит ссылку на бота
create or replace function public.ensure_telegram_code()
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_company bigint;
  v_code    text;
begin
  select id into v_company
    from public.companies
   where owner_user_id = auth.uid()
   limit 1;

  if v_company is null then
    raise exception 'Сначала создайте мастерскую';
  end if;

  -- 32 знака случайности. Больше нельзя: Telegram обрезает параметр start.
  v_code := replace(gen_random_uuid()::text, '-', '');

  perform set_config('app.telegram', 'link', true);

  update public.companies
     set telegram_link_code    = v_code,
         telegram_link_expires = now() + interval '15 minutes'
   where id = v_company;

  return v_code;
end;
$$;

-- Бот прислал /start с кодом. Возвращает название мастерской, чтобы бот
-- ответил человеку понятным текстом, а не «ок».
create or replace function public.link_telegram(p_code text, p_chat_id text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_name text;
begin
  if length(coalesce(p_code, '')) < 32 or length(coalesce(p_chat_id, '')) < 3 then
    return null;
  end if;

  perform set_config('app.telegram', 'link', true);

  update public.companies
     set telegram_chat_id      = p_chat_id,
         telegram_link_code    = null,
         telegram_link_expires = null
   where telegram_link_code = p_code
     and telegram_link_expires > now()
  returning name into v_name;

  return v_name;
end;
$$;

create or replace function public.unlink_telegram()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform set_config('app.telegram', 'link', true);

  update public.companies
     set telegram_chat_id      = null,
         telegram_link_code    = null,
         telegram_link_expires = null
   where owner_user_id = auth.uid();
end;
$$;

revoke all on function public.ensure_telegram_code() from public, anon;
revoke all on function public.unlink_telegram()      from public, anon;
grant execute on function public.ensure_telegram_code() to authenticated;
grant execute on function public.unlink_telegram()      to authenticated;
