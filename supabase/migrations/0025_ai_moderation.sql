-- Работы проверяет помощник на ИИ, а владелец разбирает только спорное.
--
-- Разбирать вручную каждую работу владелец быстро перестанет — и тогда
-- очередь превратится в кладбище, а проверка в фикцию. Поэтому обычную
-- работу пропускает ИИ, а к человеку попадает только то, в чём ИИ
-- не уверен или что он отклонил.
--
-- Решение ИИ нельзя подделать: RPC ниже требует общий секрет, который
-- живёт только в секретах Cloudflare и в браузер не попадает никогда.
-- Мастер этого секрета не знает, а без него функция ничего не меняет.

alter table public.products add column if not exists moderation_verdict text;
alter table public.products add column if not exists moderation_reason  text;
alter table public.products add column if not exists moderated_by       text;
alter table public.products add column if not exists moderated_at       timestamptz;

-- Секреты, которые нужны самой базе. Правил доступа нет специально:
-- значит через API её не прочитать ни гостю, ни вошедшему, ни мастеру.
-- Читают только функции ниже, они выполняются от имени владельца базы.
create table if not exists public.app_secrets (
  name  text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;

create or replace function public.apply_ai_moderation(
  p_secret     text,
  p_product_id bigint,
  p_verdict    text,
  p_reason     text
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_expected text;
  v_status   text;
begin
  if p_verdict not in ('approve', 'review', 'reject') then
    return 'bad_verdict';
  end if;

  select value into v_expected from public.app_secrets where name = 'ai_moderation';

  -- Секрет не задан — значит автопроверка не включена, и молча
  -- одобрять что-либо мы не имеем права. Работа ждёт человека.
  if v_expected is null or coalesce(p_secret, '') = '' then
    return 'not_configured';
  end if;
  if p_secret <> v_expected then
    return 'forbidden';
  end if;

  v_status := case p_verdict
    when 'approve' then 'active'
    when 'reject'  then 'hidden'
    else 'pending'
  end;

  -- Второй замок: сторож работ пускает поднятие отметки «проверено»
  -- только внутри этой функции. Через сайт этот флаг не выставить —
  -- PostgREST не даёт выполнять произвольный SQL.
  perform set_config('app.ai_moderation', 'on', true);

  update public.products
     set status             = v_status,
         moderated          = (p_verdict = 'approve'),
         moderation_verdict = p_verdict,
         moderation_reason  = left(coalesce(p_reason, ''), 500),
         moderated_by       = 'ai',
         moderated_at       = now(),
         updated_at         = now()
   where id = p_product_id;

  perform set_config('app.ai_moderation', '', true);

  return 'ok';
end;
$function$;

revoke all on function public.apply_ai_moderation(text, bigint, text, text) from public;
grant execute on function public.apply_ai_moderation(text, bigint, text, text) to anon, authenticated;

-- Сторож работ: добавляем единственное окно для решения ИИ.
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

  -- Решение автопроверки. Флаг поднимает только apply_ai_moderation,
  -- а её саму пускает лишь тот, кто знает секрет.
  if coalesce(current_setting('app.ai_moderation', true), '') = 'on' then
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

  if v_content_changed then
    new.moderated := false;
  end if;

  if not coalesce(new.moderated, false) and new.status = 'active' then
    new.status := 'pending';
  end if;

  if new.status not in ('draft', 'pending', 'active', 'hidden') then
    new.status := old.status;
  end if;

  return new;
end;
$function$;

-- Сколько работ этой мастерской уже прошли проверку. По этому числу
-- решаем, доверять ли автопроверке: первые работы новичка смотрит
-- человек, даже если ИИ их одобрил.
create or replace function public.company_approved_count(p_product_id bigint)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*)::int
    from public.products p
   where p.company_id = (select company_id from public.products where id = p_product_id)
     and p.moderated
     and p.id <> p_product_id
$function$;

revoke all on function public.company_approved_count(bigint) from public;
grant execute on function public.company_approved_count(bigint) to anon, authenticated;

-- Значение секрета в репозиторий не кладём. Оно создано один раз
-- в самой базе и продублировано в секретах Cloudflare как
-- AI_MODERATION_SECRET. Пока их два одинаковых — автопроверка работает;
-- пока секрета нет в Cloudflare — работы просто ждут человека.
