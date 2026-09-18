import { AuthForm } from '@/app/auth/auth-form'
import { TgOpenOutside } from '@/components/tg-open-outside'

/**
 * Вход и регистрация прямо внутри Telegram. Раньше кнопка уводила на
 * страницу большого сайта — вместе с шапкой, баннером «установите на
 * телефон» и меню каталога. Внутри мини-приложения всё это лишнее:
 * человек пришёл за своими заявками, а не гулять по сайту.
 */
export function TgWelcome({ state }: { state: 'guest' | 'no-company' }) {
  if (state === 'no-company') {
    return (
      <div className="px-4 py-10 text-center">
        <div className="display text-xl text-text">Почти всё</div>
        <p className="mx-auto mt-3 max-w-xs leading-relaxed text-text-muted">
          Осталось завести мастерскую: название, телефон, чем занимаетесь.
          Пара минут — и клиенты смогут вас найти.
        </p>
        {/*
          Завести мастерскую можно только на большом сайте: там загрузка
          фото и карта. Внутри окошка Telegram эта страница не помещается,
          поэтому открываем её браузером поверх.
        */}
        <TgOpenOutside
          path="/profile/company"
          className="press mt-6 block rounded-full bg-gold px-6 py-3.5 font-semibold text-white"
        >
          Заполнить профиль
        </TgOpenOutside>
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

      <div className="mt-6">
        <AuthForm next="/tg" compact />
      </div>
    </div>
  )
}
