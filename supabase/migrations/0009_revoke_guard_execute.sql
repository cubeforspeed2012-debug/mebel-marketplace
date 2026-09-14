-- Функции-сторожа вызываются только триггерами — снаружи их дёргать незачем.
-- Триггеры от этого не страдают: право на выполнение проверяется при создании
-- триггера, а не при каждом срабатывании.
revoke all on function public.guard_company_admin_fields() from public, anon, authenticated;
revoke all on function public.guard_promotion_insert()     from public, anon, authenticated;
revoke all on function public.guard_profile_role()         from public, anon, authenticated;
