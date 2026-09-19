-- Убираем из сторожа подделываемый флаг.
--
-- Прошлая правка пускала сброс проверки по флагу app.moderation. Флаг —
-- это обычная настройка сессии: кто сумеет выполнить set_config перед
-- своим запросом, тот обойдёт сторожа и поставит себе «проверено».
-- Через наш сайт так не сделать (PostgREST не даёт выполнять
-- произвольный SQL и не открывает set_config наружу), но защита,
-- которая держится на одной этой преграде, — плохая защита.
--
-- Оказалось, флаг вообще не нужен. Опасно только одно направление:
-- поднять себе отметку «проверено». Снять её не опасно никогда — работа
-- всего лишь вернётся на проверку. Поэтому правило теперь простое
-- и подделать в нём нечего: мастер может отметку снять, но не поставить.
-- Триггеру на фотографиях больше не нужно ничего обходить — он снимает
-- отметку, и сторож это разрешает.
create or replace function public.guard_product_moderation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_content_changed boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.moderated := false;
    if coalesce(new.status, 'pending') <> 'draft' then
      new.status := 'pending';
    end if;
    return new;
  end if;

  -- Поставить себе «проверено» нельзя. Снять — можно: это лишь отправляет
  -- работу на повторную проверку, и этим пользуется триггер фотографий.
  if coalesce(new.moderated, false) and not old.moderated then
    new.moderated := false;
  end if;

  v_content_changed :=
       new.title       is distinct from old.title
    or new.description is distinct from old.description
    or new.category_id is distinct from old.category_id
    or new.type        is distinct from old.type
    or new.price       is distinct from old.price;

  -- Содержимое другое — прежнее одобрение к нему не относится.
  if v_content_changed then
    new.moderated := false;
  end if;

  -- Непроверенной работе в каталоге не место, что бы мастер ни выбрал.
  if not coalesce(new.moderated, false) and new.status = 'active' then
    new.status := 'pending';
  end if;

  -- Чужих состояний не придумываем.
  if new.status not in ('draft', 'pending', 'active', 'hidden') then
    new.status := old.status;
  end if;

  return new;
end;
$function$;

create or replace function public.product_images_reset_moderation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_product bigint := coalesce(new.product_id, old.product_id);
begin
  if public.is_admin() then
    return coalesce(new, old);
  end if;

  -- Снять отметку сторож разрешает всем, обходить его больше не нужно.
  update public.products
     set moderated = false,
         status = case when status = 'active' then 'pending' else status end
   where id = v_product
     and moderated;

  return coalesce(new, old);
end;
$function$;
