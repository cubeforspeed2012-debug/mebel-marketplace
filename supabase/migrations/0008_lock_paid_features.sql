-- Платное — только через администратора и оплату, не своими руками.
--
-- Что было не так: у мастера были политики вида «со своей мастерской делай
-- что хочешь». Обычным запросом к API (ключ лежит в браузере у каждого) он мог
--   * выдать себе подписку premium до 2099 года за 0 сум;
--   * сам одобрить свою мастерскую, минуя проверку;
--   * поднять себя в каталоге навсегда (boosted_until);
--   * поставить себе значок «телефон подтверждён».
-- Всё это решает администратор или оплата, а не владелец мастерской.

-- 1. Убираем слишком широкие политики.
--    Чтение, создание и изменение своей мастерской остаются — они заданы
--    отдельными политиками, где явно перечислено, что можно.
drop policy if exists companies_owner_all     on public.companies;
drop policy if exists subscriptions_owner_all on public.subscriptions;

--    Дубль политики обновления профиля: та же строка разрешалась дважды,
--    причём в этой копии не было проверки на запись. Оставляем «users update own profile».
drop policy if exists profiles_update_own on public.profiles;

-- 2. Фотографии снятых с публикации товаров были видны всем подряд.
--    Своё владелец по-прежнему видит — через «owner manages own product images».
drop policy if exists product_images_select_all on public.product_images;

-- 3. Поля мастерской, которые владелец не меняет сам. Это защита на уровне
--    строки: она держится, даже если когда-нибудь ошибёмся в политике.
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

  new.status         := old.status;          -- одобрение мастерской
  new.boosted_until  := old.boosted_until;   -- подъём в каталоге
  new.phone_verified := old.phone_verified;  -- значок «телефон подтверждён»
  new.owner_user_id  := old.owner_user_id;   -- мастерскую нельзя передать чужому
  return new;
end;
$$;

drop trigger if exists companies_guard_admin_fields on public.companies;
create trigger companies_guard_admin_fields
  before update on public.companies
  for each row execute function public.guard_company_admin_fields();

-- 4. Заявка на продвижение всегда рождается со статусом «ждёт оплаты».
--    Оплаченной её делает администратор или, позже, ответ платёжной системы.
create or replace function public.guard_promotion_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.status      := 'pending';
  new.payment_ref := null;
  return new;
end;
$$;

drop trigger if exists promotions_guard_insert on public.promotions;
create trigger promotions_guard_insert
  before insert on public.promotions
  for each row execute function public.guard_promotion_insert();

-- 5. Файлы — каждый только в свою папку. Раньше любой вошедший мог залить
--    что угодно и куда угодно в общее хранилище.
drop policy if exists "authenticated uploads company media" on storage.objects;
create policy "authenticated uploads company media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Потолок размера файла на стороне хранилища: проверка в коде не спасает,
-- если файл шлют мимо приложения. Тип файла не ограничиваем — иначе
-- отвалятся фотографии с айфона.
update storage.buckets set file_size_limit = 10485760 where id = 'company-media';
