'use client'

import { useEffect, useState } from 'react'

const COOKIE = 'theme'

type Theme = 'dark' | 'light'

/**
 * Переключатель тёмной и светлой темы. Работает мгновенно: тема ставится
 * на страницу сразу, а кука запоминает выбор на год — сервер при следующей
 * загрузке отдаст страницу уже в нужном цвете, без мигания.
 */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#2b2520' : '#0f0f0f')
  }, [theme])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.cookie = `${COOKIE}=${next};path=/;max-age=31536000;samesite=lax`
  }

  const light = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? 'Включить тёмную тему' : 'Включить светлую тему'}
      title={light ? 'Тёмная тема' : 'Светлая тема'}
      className="press flex size-8 items-center justify-center rounded-full bg-white/8 text-on-dark-muted transition-colors duration-200 hover:text-on-dark"
    >
      {light ? (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8}
             strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8}
             strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </svg>
      )}
    </button>
  )
}
