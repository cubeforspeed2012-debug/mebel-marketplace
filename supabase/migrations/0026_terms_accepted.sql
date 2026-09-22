-- Когда человек согласился с условиями.
--
-- Галочку в форме мало: она живёт ровно до отправки. Если завтра
-- возникнет спор — мастер скажет, что ни с чем не соглашался, и ответить
-- будет нечем. Поэтому момент согласия записываем рядом с профилем.
--
-- Время ставит база, а не браузер: подделать его человек не может.
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- Все, кто зарегистрировался до этой правки, согласия не давали.
-- Оставляем пусто — честнее, чем проставить задним числом.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_name  text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  v_phone text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), new.phone);
  -- Согласие отмечает сервер при регистрации. Время берём своё:
  -- значение из браузера доверия не заслуживает.
  v_terms boolean := coalesce((new.raw_user_meta_data ->> 'terms_accepted')::boolean, false);
begin
  insert into public.profiles (id, role, full_name, phone, onboarded, terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'buyer'),
    v_name,
    v_phone,
    -- Регистрация по почте: имя и телефон человек ввёл сам, знакомство пройдено.
    -- Вход через Google: имя пришло из аккаунта Google, телефона нет — спросим сами.
    (v_name is not null and v_phone is not null),
    case when v_terms then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
