-- Заявка сама сообщает, куда слать уведомление мастеру.
--
-- Раньше код после заявки дочитывал telegram_chat_id прямо из таблицы.
-- Теперь гостю служебные поля мастерской не видны (вместе с ними уходил
-- и телефон), поэтому функция возвращает всё нужное сразу — и только тому,
-- кто действительно оставил заявку.
--
-- Тип возврата меняется с bigint на jsonb, поэтому функцию пересоздаём.

drop function if exists public.submit_request(bigint, text, text, text, bigint);

create function public.submit_request(
  p_company_id bigint,
  p_name text,
  p_phone text,
  p_message text default null,
  p_product_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_client_id bigint;
  v_order_id  bigint;
  v_phone     text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name      text := btrim(coalesce(p_name, ''));
  v_type      text := 'ready_made';
  v_user      uuid := auth.uid();
  v_company   text;
  v_chat      text;
begin
  if length(v_name) < 2 or length(v_name) > 100 then
    raise exception 'Укажите имя';
  end if;

  if length(v_phone) < 9 or length(v_phone) > 15 then
    raise exception 'Укажите телефон';
  end if;

  if length(coalesce(p_message, '')) > 2000 then
    raise exception 'Слишком длинное сообщение';
  end if;

  if not exists (select 1 from public.companies c where c.id = p_company_id and c.status = 'active') then
    raise exception 'Мастер не найден';
  end if;

  if p_product_id is not null then
    select case when p.type = 'custom_order' then 'custom' else 'ready_made' end
      into v_type
      from public.products p
     where p.id = p_product_id and p.company_id = p_company_id and p.status = 'active';

    if v_type is null then
      raise exception 'Товар не найден';
    end if;
  end if;

  -- защита от спама: одна заявка с номера этому мастеру раз в 5 минут
  if exists (
    select 1 from public.orders o join public.clients cl on cl.id = o.client_id
    where o.company_id = p_company_id
      and cl.phone = v_phone
      and o.created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Заявка уже отправлена, мастер скоро свяжется';
  end if;

  select id into v_client_id
    from public.clients
   where company_id = p_company_id and phone = v_phone
   limit 1;

  if v_client_id is null then
    insert into public.clients (company_id, full_name, phone, source, user_id)
    values (p_company_id, v_name, v_phone, 'site', v_user)
    returning id into v_client_id;
  else
    -- Клиент уже был у мастера, но теперь пришёл из своего аккаунта — свяжем.
    update public.clients
       set user_id = coalesce(user_id, v_user)
     where id = v_client_id;
  end if;

  insert into public.orders (client_id, company_id, product_id, type, status, title, comment, source)
  values (
    v_client_id,
    p_company_id,
    p_product_id,
    v_type,
    'new',
    coalesce((select title from public.products where id = p_product_id), 'Заявка с сайта'),
    nullif(btrim(coalesce(p_message, '')), ''),
    'site'
  )
  returning id into v_order_id;

  select name, telegram_chat_id into v_company, v_chat
    from public.companies where id = p_company_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'company_name', v_company,
    'telegram_chat_id', v_chat
  );
end;
$function$;
