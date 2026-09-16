-- Номер мастера больше не лежит в открытом виде.
--
-- Раньше телефон приезжал прямо в коде каждой страницы каталога. Любой мог
-- одним запросом выгрузить базу номеров всех мебельщиков Ташкента и потом
-- продавать её или обзванивать. Для площадки это тихая, но серьёзная утечка:
-- мастера уходят, когда им начинают названивать «рекламные агентства».
--
-- Теперь номер отдаётся по одному, только по нажатию кнопки «Показать номер»,
-- и каждое такое нажатие считается — мастеру полезно видеть, сколько людей
-- захотели ему позвонить.

-- 1. Признак «телефон есть» — его показывать можно, сам номер нельзя.
alter table public.companies
  add column if not exists has_phone boolean
  generated always as (phone_public is not null and length(btrim(phone_public)) > 5) stored;

-- 2. Гостю больше не выдаём номер, почту, служебный чат и заметки модератора.
--    Право выдаётся по столбцам, поэтому сначала снимаем общее на таблицу.
revoke select on public.companies from anon;
grant select (
  id, owner_user_id, name, slug, description, address,
  latitude, longitude, district, work_type, status,
  logo_url, cover_url, instagram, telegram,
  phone_verified, has_phone, boosted_until, views_count,
  created_at, updated_at
) on public.companies to anon;

-- 3. Кто и когда просил номер. Одна строка на человека в день:
--    интересно, сколько разных людей захотели позвонить, а не сколько раз нажали.
create table if not exists public.contact_views (
  company_id bigint not null references public.companies(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  day        date   not null default current_date,
  visitor    text   not null,
  created_at timestamptz not null default now(),
  primary key (company_id, day, visitor)
);

create index if not exists contact_views_company_day
  on public.contact_views (company_id, day desc);

alter table public.contact_views enable row level security;

-- Свои цифры видит мастер, все — администратор. Писать напрямую нельзя никому:
-- запись появляется только через функцию ниже.
drop policy if exists "owner reads own contact views" on public.contact_views;
create policy "owner reads own contact views" on public.contact_views
  for select to authenticated
  using (exists (
    select 1 from public.companies c
     where c.id = contact_views.company_id and c.owner_user_id = auth.uid()
  ));

drop policy if exists "admin reads contact views" on public.contact_views;
create policy "admin reads contact views" on public.contact_views
  for select to authenticated using (public.is_admin());

-- 4. Выдать номер и сразу засчитать просмотр — за один заход, чтобы кнопка
--    не тормозила. Номер отдаётся только у проверенной, открытой мастерской.
create or replace function public.reveal_phone(
  p_company_id bigint,
  p_visitor    text,
  p_product_id bigint default null
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_phone text;
begin
  select phone_public into v_phone
    from public.companies
   where id = p_company_id and status = 'active';

  if v_phone is null or length(btrim(v_phone)) < 6 then
    return null;
  end if;

  -- Метку посетителя считает сервер по адресу запроса; подделать её
  -- можно, но каждая подделка стоит отдельного запроса.
  if length(coalesce(p_visitor, '')) >= 16 then
    insert into public.contact_views (company_id, product_id, day, visitor)
    values (p_company_id, p_product_id, current_date, p_visitor)
    on conflict do nothing;
  end if;

  return v_phone;
end;
$$;
