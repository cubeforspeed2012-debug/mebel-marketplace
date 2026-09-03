-- Управление аккаунтами из админки: список, блокировка, удаление.
-- Все функции доступны только администратору — проверка внутри, а не только в интерфейсе.
-- Применено через панель Supabase; файл хранится как история изменений схемы.

create or replace function public.admin_users()
returns table (
  user_id         uuid,
  email           text,
  full_name       text,
  phone           text,
  role            text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  banned_until    timestamptz,
  company_id      bigint,
  company_name    text,
  company_status  text,
  orders_count    bigint,
  clients_count   bigint
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    p.full_name,
    p.phone,
    coalesce(p.role, 'buyer'),
    u.created_at,
    u.last_sign_in_at,
    u.banned_until,
    c.id,
    c.name,
    c.status,
    coalesce((select count(*) from public.orders o  where o.company_id  = c.id), 0),
    coalesce((select count(*) from public.clients cl where cl.company_id = c.id), 0)
  from auth.users u
  left join public.profiles  p on p.id = u.id
  left join public.companies c on c.owner_user_id = u.id
  where public.is_admin()
  order by u.created_at desc;
$$;

-- Блокировка: человек остаётся в базе, но войти не может.
create or replace function public.admin_set_user_blocked(p_user uuid, p_blocked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Доступ только у администратора';
  end if;
  if p_user = auth.uid() then
    raise exception 'Нельзя заблокировать самого себя';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'Нельзя заблокировать администратора';
  end if;

  update auth.users
     set banned_until = case when p_blocked then now() + interval '100 years' else null end,
         updated_at   = now()
   where id = p_user;

  -- Мастерскую заблокированного мастера убираем из каталога сразу
  if p_blocked then
    update public.companies
       set status = 'blocked'
     where owner_user_id = p_user and status = 'active';
  end if;
end;
$$;

-- Удаление: вместе с человеком уходит его мастерская со всем содержимым.
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company bigint;
begin
  if not public.is_admin() then
    raise exception 'Доступ только у администратора';
  end if;
  if p_user = auth.uid() then
    raise exception 'Нельзя удалить самого себя';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'Нельзя удалить администратора';
  end if;

  select id into v_company from public.companies where owner_user_id = p_user;

  -- Товары, фото, заявки и клиенты уходят каскадом за мастерской
  if v_company is not null then
    delete from public.companies where id = v_company;
  end if;

  delete from public.profiles      where id      = p_user;
  delete from auth.identities      where user_id = p_user;
  delete from auth.users           where id      = p_user;
end;
$$;

revoke all on function public.admin_users()                              from public, anon;
revoke all on function public.admin_set_user_blocked(uuid, boolean)      from public, anon;
revoke all on function public.admin_delete_user(uuid)                    from public, anon;

grant execute on function public.admin_users()                           to authenticated;
grant execute on function public.admin_set_user_blocked(uuid, boolean)   to authenticated;
grant execute on function public.admin_delete_user(uuid)                 to authenticated;
