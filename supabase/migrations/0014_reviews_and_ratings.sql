-- Отзывы и рейтинг мастера.
--
-- Покупателю нужно, на что опереться при выборе, — звёзды сильнее любого
-- дизайна. Один человек оставляет один отзыв на мастерскую (повторная
-- отправка обновляет прежний). Свою мастерскую оценить нельзя — это
-- запрещает политика вставки. Средняя оценка и число отзывов лежат прямо
-- в companies и пересчитываются триггером: карточкам в каталоге не нужно
-- ничего считать на лету.

alter table public.companies
  add column if not exists rating_avg   numeric(3,2) not null default 0,
  add column if not exists rating_count integer      not null default 0;

-- Гостю права выдаются по столбцам — новые надо открыть явно
grant select (rating_avg, rating_count) on public.companies to anon;

create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  company_id  bigint not null references public.companies(id) on delete cascade,
  user_id     uuid   not null references auth.users(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  text        text check (length(text) <= 1000),
  author_name text,
  status      text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists reviews_company_idx on public.reviews (company_id, created_at desc);
create index if not exists reviews_user_idx    on public.reviews (user_id);

alter table public.reviews enable row level security;

create policy "visible reviews are public" on public.reviews
  for select to anon, authenticated
  using (status = 'visible' or user_id = (select auth.uid()) or public.is_admin());

create policy "buyer leaves one review" on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.companies c
       where c.id = reviews.company_id and c.owner_user_id = (select auth.uid())
    )
  );

create policy "author edits own review" on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "author deletes own review" on public.reviews
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "admin moderates reviews" on public.reviews
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Автор не может сам сделать отзыв скрытым/видимым и не может переписать,
-- чей это отзыв и о ком. Скрывает только администратор.
create or replace function public.guard_review_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    new.status     := coalesce(old.status, 'visible');
    new.user_id    := coalesce(old.user_id, new.user_id);
    new.company_id := coalesce(old.company_id, new.company_id);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard
  before insert or update on public.reviews
  for each row execute function public.guard_review_fields();

-- Пересчёт средней оценки. Считаются только видимые отзывы.
create or replace function public.recount_company_rating()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_company bigint := coalesce(new.company_id, old.company_id);
begin
  update public.companies
     set rating_avg = coalesce((
           select round(avg(rating)::numeric, 2)
             from public.reviews
            where company_id = v_company and status = 'visible'), 0),
         rating_count = (
           select count(*) from public.reviews
            where company_id = v_company and status = 'visible')
   where id = v_company;
  return null;
end;
$$;

drop trigger if exists reviews_recount on public.reviews;
create trigger reviews_recount
  after insert or update or delete on public.reviews
  for each row execute function public.recount_company_rating();

revoke all on function public.guard_review_fields()     from public, anon, authenticated;
revoke all on function public.recount_company_rating()  from public, anon, authenticated;
