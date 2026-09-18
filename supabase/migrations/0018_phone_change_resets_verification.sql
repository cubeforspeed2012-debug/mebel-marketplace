-- Смена номера снимает подтверждение.
--
-- Без этого защита обходилась в два движения: мастер подтверждал свой
-- настоящий номер через Telegram, получал галочку — и тут же менял номер
-- в профиле на любой другой. Галочка оставалась, и в каталоге чужой номер
-- висел с отметкой «проверен». Ровно то мошенничество, ради которого
-- проверка и затевалась.
--
-- Галочка обязана относиться к тому номеру, который сейчас показан
-- клиенту, а не к какому-то прежнему. Поэтому правило простое: изменился
-- номер — подтверждение сброшено, подтверждай заново. Это касается всех,
-- включая администратора: он тоже может поправить номер, и старое
-- подтверждение к новому номеру отношения не имеет.
--
-- Здесь же сторож учится пускать подтверждение: поднять галочку можно
-- только изнутри verify_phone_by_telegram, которая на свою транзакцию
-- выставляет app.phone = 'verify'.
create or replace function public.guard_company_admin_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Первым делом, до всех послаблений: номер сменился — галочка снята.
  if new.phone_public is distinct from old.phone_public then
    new.phone_verified := false;
  end if;

  if public.is_admin() then
    return new;
  end if;

  new.status        := old.status;
  new.boosted_until := old.boosted_until;
  new.owner_user_id := old.owner_user_id;

  -- Поднять галочку может только подтверждение через Telegram: оно
  -- поднимает этот флаг на время своей транзакции. Обычная правка
  -- профиля его не поднимает — вписать себе «проверено» нельзя.
  if coalesce(current_setting('app.phone', true), '') <> 'verify' then
    new.phone_verified := coalesce(new.phone_verified, false) and old.phone_verified;
  end if;

  -- Привязку Telegram меняют только функции привязки — тот же приём.
  if coalesce(current_setting('app.telegram', true), '') <> 'link' then
    new.telegram_chat_id      := old.telegram_chat_id;
    new.telegram_link_code    := old.telegram_link_code;
    new.telegram_link_expires := old.telegram_link_expires;
  end if;

  return new;
end;
$function$;
