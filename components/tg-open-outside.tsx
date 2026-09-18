'use client'

import { SITE_URL } from '@/lib/constants'

type WebApp = { openLink?: (url: string) => void }

/**
 * Ссылка, которая уводит из мини-приложения наружу.
 *
 * Внутри Telegram обычная ссылка открывает большой сайт прямо в окошке
 * мини-приложения — с шапкой, подвалом и меню каталога. Получается
 * приложение внутри приложения: человек пришёл посмотреть заявки,
 * а оказался на витрине, и обратно к аналитике уже не вернуться.
 *
 * Поэтому такие переходы отдаём самому Telegram: он открывает адрес
 * в браузере поверх, а мини-приложение остаётся на месте — закрыл
 * браузер и снова видишь свои цифры.
 */
export function TgOpenOutside({
  path,
  className,
  children,
}: {
  /** Путь на большом сайте, например /dashboard */
  path: string
  className?: string
  children: React.ReactNode
}) {
  const href = `${SITE_URL}${path}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={(event) => {
        const app = (window as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp
        if (app?.openLink) {
          // Telegram открывает поверх своим браузером — мини-приложение живо
          event.preventDefault()
          app.openLink(href)
        }
        // Telegram нет (человек открыл /tg в обычном браузере) —
        // работает как обычная ссылка в новой вкладке
      }}
    >
      {children}
    </a>
  )
}
