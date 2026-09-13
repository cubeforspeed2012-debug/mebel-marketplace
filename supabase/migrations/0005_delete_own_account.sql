-- Человек может удалить свой аккаунт сам, из настроек.
-- Применено через панель Supabase; файл хранится как история изменений схемы.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_company bigint;
begin
  if v_user is null then
    raise exception 'Нужно войти';
  end if;

  -- Администратора так удалить нельзя: иначе площадка останется без хозяина
  if exists (select 1 from public.profiles where id = v_user and role = 'admin') then
    raise exception 'Администратор не может удалить свой аккаунт здесь';
  end if;

  select id into v_company from public.companies where owner_user_id = v_user;

  -- Товары, фото, заявки и клиенты уходят каскадом за мастерской
  if v_company is not null then
    delete from public.companies where id = v_company;
  end if;

  delete from public.profiles where id = v_user;
  delete from auth.identities where user_id = v_user;
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
