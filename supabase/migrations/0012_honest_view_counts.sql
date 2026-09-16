-- Просмотры больше не накручиваются.
--
-- Счётчик увеличивался на каждый вызов, без всяких проверок. Любой мог
-- дёрнуть его в цикле и нарисовать себе десять тысяч просмотров — или,
-- наоборот, накрутить конкуренту. Мастер смотрит в эти числа и по ним
-- решает, платить ли за продвижение, так что цифра обязана быть честной.
--
-- Теперь один человек за день считается один раз, а свои собственные
-- заходы мастеру в статистику не пишутся.

-- Отметки «этот человек сегодня здесь уже был». Пишет только функция ниже,
-- поэтому политик нет — снаружи таблица закрыта полностью.
create table if not exists public.view_marks (
  kind      text   not null,
  target_id bigint not null default 0,
  day       date   not null default current_date,
  visitor   text   not null,
  primary key (kind, target_id, day, visitor)
);

alter table public.view_marks enable row level security;

create or replace function public.bump_views(
  p_kind    text,
  p_id      bigint default null,
  p_visitor text   default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_added integer := 0;
  v_owner uuid;
begin
  -- Без отпечатка посетителя не считаем: иначе счётчик крутится в цикле
  if length(coalesce(p_visitor, '')) < 16 then
    return;
  end if;

  -- Свои собственные заходы мастеру в статистику не пишем
  if p_kind = 'company' and p_id is not null then
    select owner_user_id into v_owner from public.companies where id = p_id;
  elsif p_kind = 'product' and p_id is not null then
    select c.owner_user_id into v_owner
      from public.products p join public.companies c on c.id = p.company_id
     where p.id = p_id;
  end if;

  if v_owner is not null and v_owner = auth.uid() then
    return;
  end if;

  -- Один человек за день — одна отметка. Повтор просто ничего не делает.
  insert into public.view_marks (kind, target_id, day, visitor)
  values (p_kind, coalesce(p_id, 0), current_date, p_visitor)
  on conflict do nothing;

  get diagnostics v_added = row_count;
  if v_added = 0 then
    return;
  end if;

  insert into public.site_visits (day, views, updated_at)
  values (current_date, 1, now())
  on conflict (day) do update
    set views = public.site_visits.views + 1, updated_at = now();

  if p_kind = 'company' and p_id is not null then
    update public.companies set views_count = views_count + 1 where id = p_id;
  elsif p_kind = 'product' and p_id is not null then
    update public.products set views_count = views_count + 1 where id = p_id;
  end if;

  -- Изредка подчищаем старые отметки, чтобы таблица не росла вечно
  if random() < 0.002 then
    delete from public.view_marks where day < current_date - 30;
  end if;
end;
$$;
