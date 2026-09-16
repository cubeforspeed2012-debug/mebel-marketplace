'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Что-то упало на странице. Без этого человек видел белый экран и уходил.
 * Показываем понятный текст и кнопку «Попробовать снова» — чаще всего
 * этого достаточно: сбой бывает разовый.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // В журнал Cloudflare — чтобы потом было видно, что именно падало
    console.error('Ошибка страницы:', error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-gold-soft">
        <svg viewBox="0 0 24 24" className="size-8 text-gold" fill="none" strokeWidth={1.8}
             stroke="currentColor" strokeLinecap="round" aria-hidden>
          <path d="M12 8v5M12 16.5v.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>

      <h1 className="display mt-6 text-2xl text-text">Страница не открылась</h1>

      <p className="mt-3 leading-relaxed text-text-muted">
        Это сбой на нашей стороне, а не у вас. Чаще всего помогает просто
        попробовать ещё раз.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="press rounded-full bg-gold px-7 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
        >
          Попробовать снова
        </button>
        <Link
          href="/"
          className="press rounded-full border border-line px-7 py-3 font-semibold text-text transition-colors hover:border-gold"
        >
          На главную
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs text-text-muted">Код сбоя: {error.digest}</p>
      )}
    </div>
  )
}
