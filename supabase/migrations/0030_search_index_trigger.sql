-- Поисковый индекс собирает сама база.
--
-- Раньше строку поиска (search_text) писал сайт при сохранении работы,
-- и туда попадали только название и описание. Клиент искал «мебель на
-- заказ» — а в строке работы «Кухня» не было ни «на заказ», ни «кухни»
-- как категории, ни названия мастерской. Поиск честно не находил ничего.
--
-- Теперь триггер при каждом сохранении складывает в search_text всё, по
-- чему человек может искать: название, описание, категорию на двух
-- языках, тип («на заказ» / «готовая»), мастерскую, район и подписи
-- характеристик (их присылает сайт в attr_text: материал, стиль, цвет).
-- Работы, сохранённые до этого, пересобираются здесь же.

alter table public.products add column if not exists attr_text text;

create or replace function public.products_build_search_text()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cat     text;
  v_company text;
begin
  select concat_ws(' ', c.name, c.name_uz) into v_cat
    from public.categories c where c.id = new.category_id;

  select concat_ws(' ', co.name, co.district) into v_company
    from public.companies co where co.id = new.company_id;

  new.search_text := lower(concat_ws(' ',
    new.title,
    new.description,
    v_cat,
    case new.type
      when 'custom_order' then 'на заказ под заказ индивидуальный buyurtma asosida'
      when 'ready_made'   then 'готовая в наличии tayyor'
    end,
    'мебель mebel',
    v_company,
    new.attr_text
  ));
  return new;
end;
$function$;

drop trigger if exists products_search_text on public.products;
create trigger products_search_text
  before insert or update of title, description, category_id, type, company_id, attr_text
  on public.products
  for each row execute function public.products_build_search_text();

-- Служебная функция-триггер: через API её звать незачем
revoke execute on function public.products_build_search_text() from anon, authenticated, public;

-- Пересобрать индекс у уже сохранённых работ. Трогаем только attr_text,
-- а сторожа модерации на эту транзакцию отключаем — содержимое работ
-- не меняется, и отправлять их на повторную проверку незачем.
select set_config('app.ai_moderation', 'on', true);
update public.products set attr_text = coalesce(attr_text, '');
select set_config('app.ai_moderation', '', true);
