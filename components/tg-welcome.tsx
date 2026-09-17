import Link from 'next/link'

/** Приветствие для гостя и подсказка тому, кто ещё не завёл мастерскую. */
export function TgWelcome({ state }: { state: 'guest' | 'no-company' }) {
  if (state === 'no-company') {
    return (
      <div className="px-4 py-10 text-center">
        <div className="display text-xl text-text">Почти всё</div>
        <p className="mx-auto mt-3 max-w-xs leading-relaxed text-text-muted">
          Осталось завести мастерскую: название, телефон, чем занимаетесь.
          Пара минут — и клиенты смогут вас найти.
        </p>
        <Link
          href="/profile/company"
          className="press mt-6 block rounded-full bg-gold px-6 py-3.5 font-semibold text-white"
        >
          Заполнить профиль
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-10 text-center">
      <div className="display text-2xl text-text">
        Добро пожаловать в Mebel<span className="text-gold">.</span>
      </div>
      <p className="mx-auto mt-3 max-w-xs leading-relaxed text-text-muted">
        Здесь мастер видит свои заявки и цифры, не выходя из Telegram.
        Войдите или заведите кабинет — это бесплатно.
      </p>

      <Link
        href="/auth?next=/tg"
        className="press mt-7 block rounded-full bg-gold px-6 py-3.5 font-semibold text-white"
      >
        Войти
      </Link>
      <Link
        href="/auth?mode=signup&next=/tg"
        className="press mt-3 block rounded-full border border-line bg-paper px-6 py-3.5 font-semibold text-text"
      >
        Зарегистрироваться
      </Link>
    </div>
  )
}
