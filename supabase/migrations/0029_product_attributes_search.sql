-- Поиск по характеристикам работы.
--
-- Клиент ищет не «кухню», а «кухню из МДФ в стиле лофт». Раньше это
-- лежало в свободном описании, и поиск по названию его не видел.
-- Теперь мастер выбирает материал, стиль, цвет, комнату и размеры
-- из списков (products.attributes), а сайт при сохранении собирает
-- из них строку для поиска на двух языках — search_text.
--
-- Индексы: trigram по search_text, чтобы «кухн» находило «кухня»,
-- и по attributes, чтобы фильтры каталога не сканировали всю таблицу.

alter table public.products add column if not exists search_text text;

update public.products
   set search_text = lower(coalesce(title, '') || ' ' || coalesce(description, ''))
 where search_text is null;

create index if not exists products_search_text_trgm
  on public.products using gin (search_text gin_trgm_ops);

create index if not exists products_attributes_idx
  on public.products using gin (attributes jsonb_path_ops);
