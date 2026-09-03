-- Знакомство после входа через Google + защита роли администратора.
-- Применено через панель Supabase; файл хранится как история изменений схемы.

alter table public.profiles
  add column if not exists onboarded boolean not null default false;

update public.profiles
   set onboarded = true
 where onboarded = false
   and full_name is not null
   and full_name <> '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name  text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  v_phone text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), new.phone);
begin
  insert into public.profiles (id, role, full_name, phone, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'buyer'),
    v_name,
    v_phone,
    -- Регистрация по почте: имя и телефон человек ввёл сам, знакомство пройдено.
    -- Вход через Google: имя пришло из аккаунта Google, телефона нет — спросим сами.
    (v_name is not null and v_phone is not null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Человек правит своё имя и телефон, но не роль администратора
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if (new.role = 'admin' or old.role = 'admin') and not public.is_admin() then
      new.role := old.role;
    end if;

    if new.role is null or new.role not in ('buyer', 'seller', 'admin') then
      new.role := old.role;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

revoke all on function public.guard_profile_role() from public, anon, authenticated;
