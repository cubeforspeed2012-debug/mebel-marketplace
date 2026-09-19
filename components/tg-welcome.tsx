import { TgOpenOutside } from '@/components/tg-open-outside'
import { TgSignIn } from '@/components/tg-signin'

/**
 * Первый экран мини-приложения.
 *
 * Мини-приложение — это витрина цифр для мастера, у которого уже есть
 * мастерская. Поэтому здесь только вход. Всё, что требует большого экрана
 * (регистрация, заполнение мастерской, загрузка работ), уводим браузером
 * наружу, а не подменяем окошко Telegram целым сайтом.
 */
export function TgWelcome({
  state,
  error,
}: {
  state: 'guest' | 'no-company'
  /** Вошёл через Google почтой, которой у нас нет */
  error?: string
}) {
  if (state === 'no-company') {
    return (
      <div className="px-4 py-10 text-center">
        <div className="display text-xl text-text">Почти всё</div>
        <p className="mx-auto mt-3 max-w-xs leading-relaxed text-text-muted">
          Осталось завести мастерскую: название, телефон, чем занимаетесь.
          Это делается на сайте — там есть загрузка фото и выбор района.
        </p>
        <TgOpenOutside
          path="/profile/company"
          className="press mt-6 block rounded-full bg-gold px-6 py-3.5 font-semibold text-white"
        >
          Заполнить на сайте
        </TgOpenOutside>
        <p className="mt-3 text-xs text-text-muted">
          Откроется браузером. Закончите — возвращайтесь сюда за цифрами
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-7">
      <div className="text-center">
        <div className="display text-2xl text-text">
          Mebel<span className="text-gold">.</span>
        </div>
        <div className="eyebrow mt-2">Кабинет мастера</div>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-text-muted">
          Заявки, клиенты и цифры — не выходя из Telegram
        </p>
      </div>

      {error === 'no-account' && (
        <div className="mt-6 rounded-2xl border border-[#b91c1c]/40 bg-[#b91c1c]/10 px-4 py-4 text-sm leading-relaxed text-status-error">
          <b>Такого аккаунта нет.</b>
          <br />
          Мастера с этой почтой мы не нашли. Проверьте, тем ли аккаунтом Google
          вы вошли, или зарегистрируйтесь на сайте.
        </div>
      )}

      <div className="mt-6">
        <TgSignIn />
      </div>
    </div>
  )
}
