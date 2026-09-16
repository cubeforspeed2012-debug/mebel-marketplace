-- Уборка после нескольких волн правок.
--
-- 1. Дубли правил доступа. Одно и то же разрешалось двумя политиками сразу,
--    и база проверяла обе на каждой строке. Оставляем те, где есть проверка
--    на запись (WITH CHECK) — без неё политика разрешает записать то,
--    что потом сама же не даст прочитать.
drop policy if exists categories_select_all             on public.categories;
drop policy if exists clients_owner_all                 on public.clients;
drop policy if exists orders_seller_all                 on public.orders;
drop policy if exists orders_buyer_select               on public.orders;
drop policy if exists order_attachments_seller_all      on public.order_attachments;
drop policy if exists product_images_manage_own         on public.product_images;
drop policy if exists products_manage_own               on public.products;
drop policy if exists products_select_public            on public.products;
drop policy if exists profiles_select_own               on public.profiles;

-- 2. Внешние ключи без индексов. Пока строк мало — незаметно; на тысячах
--    заказов каждая выборка начнёт перебирать таблицу целиком.
create index if not exists categories_parent_idx        on public.categories (parent_id);
create index if not exists clients_created_by_idx       on public.clients (created_by);
create index if not exists clients_user_idx             on public.clients (user_id);
create index if not exists companies_owner_idx          on public.companies (owner_user_id);
create index if not exists contact_views_product_idx    on public.contact_views (product_id);
create index if not exists favorites_product_idx        on public.favorites (product_id);
create index if not exists order_attachments_order_idx  on public.order_attachments (order_id);
create index if not exists order_attachments_by_idx     on public.order_attachments (uploaded_by);
create index if not exists orders_assigned_idx          on public.orders (assigned_to);
create index if not exists orders_client_idx            on public.orders (client_id);
create index if not exists orders_product_idx           on public.orders (product_id);
create index if not exists product_images_product_idx   on public.product_images (product_id);
create index if not exists promotions_product_idx       on public.promotions (product_id);
create index if not exists subscriptions_company_idx    on public.subscriptions (company_id);

-- 3. Поиск по названию в каталоге шёл перебором всех товаров.
create extension if not exists pg_trgm;
create index if not exists products_title_trgm_idx on public.products using gin (title gin_trgm_ops);
