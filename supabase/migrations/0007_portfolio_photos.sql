-- Портфолио мастера: фотографии сделанных работ, без цены и заказа.
-- Применено через панель Supabase; файл хранится как история изменений схемы.

create table if not exists public.portfolio_photos (
  id         bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  url        text not null,
  caption    text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_company_idx on public.portfolio_photos (company_id, sort_order);

alter table public.portfolio_photos enable row level security;

-- Портфолио открытой мастерской видят все: ради него люди и заходят
drop policy if exists "portfolio is public" on public.portfolio_photos;
create policy "portfolio is public" on public.portfolio_photos for select
  to anon, authenticated
  using (exists (
    select 1 from public.companies c
    where c.id = portfolio_photos.company_id and c.status = 'active'
  ));

-- Правит его только хозяин мастерской
drop policy if exists "owner manages portfolio" on public.portfolio_photos;
create policy "owner manages portfolio" on public.portfolio_photos for all to authenticated
  using (exists (
    select 1 from public.companies c
    where c.id = portfolio_photos.company_id and c.owner_user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.companies c
    where c.id = portfolio_photos.company_id and c.owner_user_id = auth.uid()
  ));
