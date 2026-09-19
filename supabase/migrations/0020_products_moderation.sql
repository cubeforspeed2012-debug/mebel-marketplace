-- Работа попадает в каталог после проверки, а не сразу.
--
-- Раньше мастер добавлял работу и она в ту же секунду висела в каталоге.
-- Значит первый же человек мог выложить чужие фото из интернета или
-- что-то непристойное — и это увидели бы все, включая Google.
--
-- Теперь новая работа ждёт администратора. И, как с номером телефона,
-- закрываем подмену после одобрения: поменял название, описание, цену
-- или фотографии — работа снова уходит на проверку. Иначе схема обхода
-- в два движения: показать красивую кухню, дождаться одобрения,
-- а потом подменить содержимое.

alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status = any (array['draft', 'pending', 'active', 'hidden']));

-- Помним, что работа уже проходила проверку: одобренную мастер волен
-- прятать и показывать сам, не дёргая администратора каждый раз.
alter table public.products add column if not exists moderated boolean not null default false;

-- Всё, что заведено до этой правки, считаем уже проверенным —
-- иначе каталог опустеет на ровном месте.
update public.products set moderated = true where status = 'active';

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
    -- Новая работа всегда ждёт проверки. Черновик остаётся черновиком:
    -- мастер ещё сам не закончил, показывать его администратору незачем.
    new.moderated := false;
    if coalesce(new.status, 'pending') <> 'draft' then
      new.status := 'pending';
    end if;
    return new;
  end if;

  -- Поднять себе «проверено» мастер не может ни при каких условиях.
  new.moderated := old.moderated;

  v_content_changed :=
       new.title       is distinct from old.title
    or new.description is distinct from old.description
    or new.category_id is distinct from old.category_id
    or new.type        is distinct from old.type
    or new.price       is distinct from old.price;

  if v_content_changed then
    -- Содержимое другое — прежнее одобрение к нему не относится.
    new.moderated := false;
    if new.status <> 'draft' then
      new.status := 'pending';
    end if;
    return new;
  end if;

  if not old.moderated then
    -- Ещё не проверяли — в каталог не пускаем, что бы мастер ни выбрал.
    if new.status = 'active' then
      new.status := 'pending';
    end if;
    return new;
  end if;

  -- Проверенную работу мастер прячет и показывает сам.
  if new.status not in ('active', 'hidden', 'draft') then
    new.status := old.status;
  end if;

  return new;
end;
$function$;

drop trigger if exists guard_product_moderation on public.products;
create trigger guard_product_moderation
before insert or update on public.products
for each row execute function public.guard_product_moderation();

-- Фотографии — главный способ обмануть проверку: одобрили кухню,
-- а потом подменили снимки. Поэтому правка фото тоже возвращает
-- работу на проверку.
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

  update public.products
     set moderated = false,
         status = case when status = 'active' then 'pending' else status end
   where id = v_product
     and moderated;

  return coalesce(new, old);
end;
$function$;

drop trigger if exists product_images_reset_moderation on public.product_images;
create trigger product_images_reset_moderation
after insert or update or delete on public.product_images
for each row execute function public.product_images_reset_moderation();
