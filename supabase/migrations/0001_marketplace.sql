-- =============================================================
-- Mebel — маркетплейс мебели (Ташкент)
-- Миграция 0001: достройка существующей схемы под маркетплейс
--
-- Что уже было в базе: profiles, companies, categories, products,
-- product_images, clients, orders, order_attachments, subscriptions, leads.
-- Здесь добавляются поля и таблицы, которых не хватало:
--   • публичный профиль компании (описание, лого, соцсети, slug)
--   • модерация и верификация продавца
--   • платное продвижение (буст объявлений)
--   • категории каталога (RU/UZ) + сиды
--   • публичное чтение каталога через RLS
-- =============================================================

-- -------------------------------------------------------------
-- 1. КОМПАНИИ (профиль продавца)
-- -------------------------------------------------------------
alter table public.companies
  add column if not exists slug           text,
  add column if not exists description    text,
  add column if not exists logo_url       text,
  add column if not exists cover_url      text,
  add column if not exists instagram      text,
  add column if not exists telegram       text,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists email          text,
  add column if not exists boosted_until  timestamptz,
  add column if not exists views_count    integer not null default 0,
  add column if not exists updated_at     timestamptz not null default now();

-- Уникальный человекопонятный адрес: /company/mebel-usta-yunusabad
create unique index if not exists companies_slug_key on public.companies (slug);

-- status: pending — ждёт модерации, active — виден в каталоге, blocked — заблокирован
alter table public.companies
  drop constraint if exists companies_status_check;
alter table public.companies
  add constraint companies_status_check
  check (status in ('pending', 'active', 'blocked'));

-- Новые компании попадают на модерацию, а не сразу в каталог
alter table public.companies alter column status set default 'pending';

create index if not exists companies_status_idx    on public.companies (status);
create index if not exists companies_work_type_idx on public.companies (work_type);
create index if not exists companies_district_idx  on public.companies (district);

-- -------------------------------------------------------------
-- 2. КАТЕГОРИИ (двуязычные + slug для URL)
-- -------------------------------------------------------------
alter table public.categories
  add column if not exists slug       text,
  add column if not exists name_uz    text,
  add column if not exists sort_order integer not null default 0;

create unique index if not exists categories_slug_key on public.categories (slug);

-- Категории каталога на старте. vertical='furniture' — задел на бытовую технику потом.
insert into public.categories (vertical, slug, name, name_uz, sort_order)
values
  ('furniture', 'kitchens',        'Кухни',              'Oshxonalar',            1),
  ('furniture', 'bedroom-living',  'Спальни и гостиные', 'Yotoqxona va mehmonxona', 2),
  ('furniture', 'office',          'Офисная мебель',     'Ofis mebeli',           3),
  ('furniture', 'kids',            'Детская мебель',     'Bolalar mebeli',        4)
on conflict (slug) do update
  set name       = excluded.name,
      name_uz    = excluded.name_uz,
      sort_order = excluded.sort_order;

-- -------------------------------------------------------------
-- 3. ТОВАРЫ
-- -------------------------------------------------------------
alter table public.products
  add column if not exists slug          text,
  add column if not exists price_from    boolean not null default true,  -- «цена от» — для мебели на заказ
  add column if not exists currency      text not null default 'UZS',
  add column if not exists boosted_until timestamptz,
  add column if not exists views_count   integer not null default 0,
  add column if not exists updated_at    timestamptz not null default now();

alter table public.products
  drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status in ('draft', 'active', 'hidden'));

create index if not exists products_company_idx  on public.products (company_id);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_status_idx   on public.products (status);
create index if not exists products_boost_idx    on public.products (boosted_until desc nulls last);

-- -------------------------------------------------------------
-- 4. ПРОДВИЖЕНИЕ (платный буст) — вторая статья дохода после подписки
-- -------------------------------------------------------------
create table if not exists public.promotions (
  id               bigint generated always as identity primary key,
  company_id       bigint not null references public.companies (id) on delete cascade,
  product_id       bigint references public.products (id) on delete cascade,
  kind             text not null check (kind in ('boost', 'top_listing', 'banner')),
  hours            integer not null default 5,          -- «поднятие на 5 часов»
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz not null,
  amount           numeric,
  currency         text not null default 'UZS',
  payment_provider text check (payment_provider in ('payme', 'click', 'manual')),
  payment_ref      text,
  status           text not null default 'pending'
                   check (status in ('pending', 'paid', 'active', 'expired', 'cancelled')),
  created_at       timestamptz not null default now()
);

create index if not exists promotions_company_idx on public.promotions (company_id);
create index if not exists promotions_active_idx  on public.promotions (status, ends_at);

-- -------------------------------------------------------------
-- 5. ПОДПИСКИ — фиксируем допустимые значения
-- -------------------------------------------------------------
alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('trial', 'active', 'past_due', 'cancelled', 'expired'));

alter table public.subscriptions
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'standard', 'premium'));

-- -------------------------------------------------------------
-- 6. RLS — кто что видит
--    Каталог читают все (включая незалогиненных гостей),
--    редактирует — только владелец компании.
-- -------------------------------------------------------------

-- Категории: публичное чтение
drop policy if exists "categories are public" on public.categories;
create policy "categories are public"
  on public.categories for select
  to anon, authenticated
  using (true);

-- Компании: публично видны только прошедшие модерацию
drop policy if exists "active companies are public" on public.companies;
create policy "active companies are public"
  on public.companies for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists "owner reads own company" on public.companies;
create policy "owner reads own company"
  on public.companies for select
  to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists "owner creates own company" on public.companies;
create policy "owner creates own company"
  on public.companies for insert
  to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "owner updates own company" on public.companies;
create policy "owner updates own company"
  on public.companies for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Товары: публично видны активные товары активных компаний
drop policy if exists "active products are public" on public.products;
create policy "active products are public"
  on public.products for select
  to anon, authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.companies c
      where c.id = products.company_id and c.status = 'active'
    )
  );

drop policy if exists "owner manages own products" on public.products;
create policy "owner manages own products"
  on public.products for all
  to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = products.company_id and c.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.companies c
      where c.id = products.company_id and c.owner_user_id = auth.uid()
    )
  );

-- Фото товаров: видны вместе с товаром
drop policy if exists "product images are public" on public.product_images;
create policy "product images are public"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      join public.companies c on c.id = p.company_id
      where p.id = product_images.product_id
        and p.status = 'active'
        and c.status = 'active'
    )
  );

drop policy if exists "owner manages own product images" on public.product_images;
create policy "owner manages own product images"
  on public.product_images for all
  to authenticated
  using (
    exists (
      select 1 from public.products p
      join public.companies c on c.id = p.company_id
      where p.id = product_images.product_id and c.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      join public.companies c on c.id = p.company_id
      where p.id = product_images.product_id and c.owner_user_id = auth.uid()
    )
  );

-- Профиль: каждый видит и правит только свой
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Продвижение: владелец видит и создаёт своё
alter table public.promotions enable row level security;

drop policy if exists "owner reads own promotions" on public.promotions;
create policy "owner reads own promotions"
  on public.promotions for select
  to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = promotions.company_id and c.owner_user_id = auth.uid()
    )
  );

drop policy if exists "owner creates own promotions" on public.promotions;
create policy "owner creates own promotions"
  on public.promotions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.companies c
      where c.id = promotions.company_id and c.owner_user_id = auth.uid()
    )
  );

-- Подписки: владелец видит свои (оплату проставляет только сервер)
drop policy if exists "owner reads own subscriptions" on public.subscriptions;
create policy "owner reads own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = subscriptions.company_id and c.owner_user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- 7. АВТО-СОЗДАНИЕ ПРОФИЛЯ при регистрации
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'buyer'),
    new.raw_user_meta_data ->> 'full_name',
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- 8. ХРАНИЛИЩЕ ФОТО
--    Публичный бакет: фото товаров и портфолио видят все,
--    загружает только владелец в свою папку company-<id>/…
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('company-media', 'company-media', true)
on conflict (id) do nothing;

drop policy if exists "company media is public" on storage.objects;
create policy "company media is public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'company-media');

drop policy if exists "authenticated uploads company media" on storage.objects;
create policy "authenticated uploads company media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'company-media');

drop policy if exists "owner deletes own company media" on storage.objects;
create policy "owner deletes own company media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'company-media' and owner = auth.uid());
