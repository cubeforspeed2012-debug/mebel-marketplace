-- Гостю эти функции ни к чему: без входа они всё равно отвечают «нет».
revoke execute on function public.phone_code_allowed() from anon;
revoke execute on function public.verify_phone_by_gateway(text, text) from anon;

-- Функции-сторожа работают только как триггеры; звать их через API незачем.
revoke execute on function public.guard_product_moderation() from anon, authenticated, public;
revoke execute on function public.product_images_reset_moderation() from anon, authenticated, public;

-- Фиксированный search_path, как у остальных функций.
alter function public.phone_tail(text) set search_path = public;
