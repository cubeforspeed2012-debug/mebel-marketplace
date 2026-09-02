-- =============================================================
-- Mebel — миграция 0002: CRM продавца, админка площадки, заявки
--
-- Уже применена к базе. Файл — чтобы историю изменений можно было
-- воспроизвести на новом проекте Supabase.
-- =============================================================

-- 1. РОЛИ: добавляем администратора площадки
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('seller', 'buyer', 'admin'));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- 2. КОМПАНИИ: куда слать уведомления, заметка модератора
alter table public.companies
  add column if not exists telegram_chat_id text,
  add column if not exists moderation_note  text;

-- 3. ЗАКАЗЫ = воронка CRM: заявка → созвонились → замер → в работе → готово / отказ
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('new', 'contacted', 'measurement', 'in_progress', 'done', 'cancelled'));
alter table public.orders alter column status set default 'new';

alter table public.orders
  add column if not exists title      text,
  add column if not exists comment    text,
  add column if not exists source     text not null default 'site',
  add column if not exists sort_order integer not null default 0;

create index if not exists orders_company_status_idx on public.orders (company_id, status);
create index if not exists orders_created_idx        on public.orders (created_at desc);
create index if not exists clients_company_idx       on public.clients (company_id);
create index if not exists clients_phone_idx         on public.clients (phone);

-- 4. ПРАВА: продавец распоряжается только своими клиентами и заказами
drop policy if exists "owner manages own clients" on public.clients;
create policy "owner manages own clients" on public.clients for all to authenticated
  using (exists (select 1 from public.companies c where c.id = clients.company_id and c.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = clients.company_id and c.owner_user_id = auth.uid()));

drop policy if exists "owner manages own orders" on public.orders;
create policy "owner manages own orders" on public.orders for all to authenticated
  using (exists (select 1 from public.companies c where c.id = orders.company_id and c.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = orders.company_id and c.owner_user_id = auth.uid()));

drop policy if exists "owner manages own order attachments" on public.order_attachments;
create policy "owner manages own order attachments" on public.order_attachments for all to authenticated
  using (exists (
    select 1 from public.orders o join public.companies c on c.id = o.company_id
    where o.id = order_attachments.order_id and c.owner_user_id = auth.uid()))
  with check (exists (
    select 1 from public.orders o join public.companies c on c.id = o.company_id
    where o.id = order_attachments.order_id and c.owner_user_id = auth.uid()));

-- 5. ПРАВА АДМИНИСТРАТОРА
drop policy if exists "admin reads all companies" on public.companies;
create policy "admin reads all companies" on public.companies for select to authenticated
  using (public.is_admin());

drop policy if exists "admin updates all companies" on public.companies;
create policy "admin updates all companies" on public.companies for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin reads all products" on public.products;
create policy "admin reads all products" on public.products for select to authenticated
  using (public.is_admin());

drop policy if exists "admin reads all profiles" on public.profiles;
create policy "admin reads all profiles" on public.profiles for select to authenticated
  using (public.is_admin());

drop policy if exists "admin reads all subscriptions" on public.subscriptions;
create policy "admin reads all subscriptions" on public.subscriptions for select to authenticated
  using (public.is_admin());

-- 6. ЗАЯВКА ОТ ПОКУПАТЕЛЯ
--    Покупатель не пишет в таблицы напрямую — только через эту функцию.
--    Она проверяет данные, гасит спам и заводит клиента с заказом в CRM мастера.
create or replace function public.submit_request(
  p_company_id bigint,
  p_name       text,
  p_phone      text,
  p_message    text default null,
  p_product_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id bigint;
  v_order_id  bigint;
  v_phone     text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name      text := btrim(coalesce(p_name, ''));
  v_type      text := 'ready_made';
begin
  if length(v_name) < 2 or length(v_name) > 100 then
    raise exception 'Укажите имя';
  end if;

  if length(v_phone) < 9 or length(v_phone) > 15 then
    raise exception 'Укажите телефон';
  end if;

  if length(coalesce(p_message, '')) > 2000 then
    raise exception 'Слишком длинное сообщение';
  end if;

  if not exists (select 1 from public.companies c where c.id = p_company_id and c.status = 'active') then
    raise exception 'Мастер не найден';
  end if;

  if p_product_id is not null then
    select case when p.type = 'custom_order' then 'custom' else 'ready_made' end
      into v_type
      from public.products p
     where p.id = p_product_id and p.company_id = p_company_id and p.status = 'active';

    if v_type is null then
      raise exception 'Товар не найден';
    end if;
  end if;

  -- защита от спама: одна заявка с номера этому мастеру раз в 5 минут
  if exists (
    select 1 from public.orders o join public.clients cl on cl.id = o.client_id
    where o.company_id = p_company_id
      and cl.phone = v_phone
      and o.created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Заявка уже отправлена, мастер скоро свяжется';
  end if;

  select id into v_client_id
    from public.clients
   where company_id = p_company_id and phone = v_phone
   limit 1;

  if v_client_id is null then
    insert into public.clients (company_id, full_name, phone, source)
    values (p_company_id, v_name, v_phone, 'site')
    returning id into v_client_id;
  end if;

  insert into public.orders (client_id, company_id, product_id, type, status, title, comment, source)
  values (
    v_client_id,
    p_company_id,
    p_product_id,
    v_type,
    'new',
    coalesce((select title from public.products where id = p_product_id), 'Заявка с сайта'),
    nullif(btrim(coalesce(p_message, '')), ''),
    'site'
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.submit_request(bigint, text, text, text, bigint) from public;
grant execute on function public.submit_request(bigint, text, text, text, bigint) to anon, authenticated;

-- =============================================================
-- КАК НАЗНАЧИТЬ СЕБЯ АДМИНИСТРАТОРОМ ПЛОЩАДКИ
-- Зарегистрируйтесь на сайте, потом выполните в SQL Editor:
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'ваша@почта');
--
-- После этого откроется раздел /admin
-- =============================================================
