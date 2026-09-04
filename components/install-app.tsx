'use client'

import { useEffect, useState } from 'react'
import { useDict } from '@/components/locale-provider'

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const HIDDEN_KEY = 'mebel-install-hidden'

/**
 * Предложение поставить площадку на домашний экран.
 *
 * Android и настольный Chrome дают браузеру событие с готовым окном установки —
 * тогда показываем кнопку. iPhone такого события не даёт вообще, там установка
 * делается руками через «Поделиться», поэтому для него показываем инструкцию.
 */
export function InstallApp() {
  const dict = useDict()
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [ios, setIos] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    // Уже установлено — предлагать нечего
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true

    let dismissed = false
    try {
      dismissed = localStorage.getItem(HIDDEN_KEY) === '1'
    } catch {
      dismissed = false
    }

    const isIos =
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
      !/crios|fxios/i.test(window.navigator.userAgent)

    setIos(isIos)
    setHidden(standalone || dismissed)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }

    const onInstalled = () => {
      setHidden(true)
      try {
        localStorage.setItem(HIDDEN_KEY, '1')
      } catch {
        // Хранилище закрыто настройками — просто не запоминаем
      }
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // Служебный работник нужен браузеру, чтобы вообще предложить установку
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Не зарегистрировался — сайт работает как обычно, просто без установки
      })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setHidden(true)
    try {
      localStorage.setItem(HIDDEN_KEY, '1')
    } catch {
      // Ничего страшного: в следующий раз спросим снова
    }
  }

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    setPrompt(null)
    if (outcome === 'accepted') dismiss()
  }

  // Показываем только там, где установка реально возможна
  if (hidden || (!prompt && !ios)) return null

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="animate-fade rounded-[var(--radius)] border border-gold/40 bg-paper p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            className="size-12 shrink-0 rounded-[14px] border border-line"
          />

          <div className="min-w-0 flex-1">
            <div className="font-semibold text-text">{dict.install.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">{dict.install.text}</p>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            {prompt ? (
              <button
                type="button"
                onClick={install}
                className="press flex-1 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-deep sm:flex-none"
              >
                {dict.install.button}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSteps((value) => !value)}
                className="press flex-1 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-deep sm:flex-none"
              >
                {dict.install.iosButton}
              </button>
            )}

            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-4 py-2.5 text-sm text-text-muted transition-colors hover:text-text"
            >
              {dict.install.later}
            </button>
          </div>
        </div>

        {showSteps && (
          <div className="animate-fade mt-4 border-t border-line pt-4">
            <div className="font-semibold text-text">{dict.install.iosTitle}</div>
            <ol className="mt-3 space-y-2">
              {dict.install.iosSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-text-muted">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-gold">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-text-muted">{dict.install.iosNote}</p>
          </div>
        )}
      </div>
    </div>
  )
}
