'use client'

import Script from 'next/script'
import { useEffect } from 'react'

type WebApp = {
  ready: () => void
  expand: () => void
  colorScheme?: 'light' | 'dark'
  initDataUnsafe?: { user?: { first_name?: string } }
}

/**
 * Готовим окно Telegram: разворачиваем на весь экран и подхватываем
 * тему — если у человека Telegram тёмный, приложение открывается тёмным,
 * а не слепит белым.
 */
export function TgInit() {
  useEffect(() => {
    const start = () => {
      const app = (window as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp
      if (!app) return

      app.ready()
      app.expand()

      if (app.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
      }
    }

    start()
    // Скрипт Telegram мог ещё не догрузиться — пробуем ещё раз чуть позже
    const again = setTimeout(start, 400)
    return () => clearTimeout(again)
  }, [])

  return <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
}
