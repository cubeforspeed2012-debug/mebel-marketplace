'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Логотип Google — фирменные цвета, иначе кнопка выглядит подделкой. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.17-2 3.44-4.95 3.44-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.1 0 5.71-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.98A11.5 11.5 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.67a6.9 6.9 0 0 1 0-4.41V7.28H1.7a11.5 11.5 0 0 0 0 10.37l3.85-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.29-3.29C17.7 1.22 15.1 0 12 0 7.44 0 3.5 2.6 1.7 6.4l3.85 2.98C6.46 6.78 9 4.75 12 4.75Z"
      />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="currentColor">
      <path d="M17.05 12.5c-.03-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.96-1.54-.15-3 .9-3.78.9-.78 0-1.98-.88-3.25-.86-1.67.03-3.21.97-4.07 2.46-1.73 3-.44 7.45 1.25 9.89.83 1.2 1.81 2.53 3.1 2.48 1.25-.05 1.72-.8 3.23-.8 1.5 0 1.93.8 3.25.78 1.34-.02 2.19-1.21 3.01-2.41.95-1.38 1.34-2.72 1.36-2.79-.03-.01-2.6-1-2.62-3.93ZM14.6 4.6c.69-.83 1.15-1.99 1.02-3.14-.99.04-2.18.66-2.89 1.49-.64.73-1.19 1.9-1.04 3.03 1.1.08 2.22-.56 2.91-1.38Z" />
    </svg>
  )
}

/**
 * Вход через Google и Apple. Провайдеры включаются в панели Supabase —
 * если провайдер не настроен, показываем понятную подсказку, а не ошибку.
 */
export function OAuthButtons({ next = '/dashboard' }: { next?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null)

  async function signIn(provider: 'google' | 'apple') {
    setError(null)
    setBusy(provider)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })

      if (authError) {
        setError(
          /not enabled|unsupported|provider/i.test(authError.message)
            ? `Вход через ${provider === 'google' ? 'Google' : 'Apple'} ещё не подключён`
            : authError.message,
        )
        setBusy(null)
      }
      // При успехе браузер уходит на страницу провайдера — состояние не сбрасываем.
    } catch {
      setError('Не удалось открыть окно входа. Попробуйте ещё раз')
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-widest text-text-muted">
        <span className="h-px flex-1 bg-line" />
        или
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => signIn('google')}
          disabled={busy !== null}
          className="flex items-center justify-center gap-3 border border-line px-5 py-2.5 font-medium transition-colors hover:border-gold disabled:opacity-60"
        >
          <GoogleMark />
          {busy === 'google' ? 'Открываем…' : 'Продолжить с Google'}
        </button>

        <button
          type="button"
          onClick={() => signIn('apple')}
          disabled={busy !== null}
          className="flex items-center justify-center gap-3 border border-line px-5 py-2.5 font-medium transition-colors hover:border-gold disabled:opacity-60"
        >
          <AppleMark />
          {busy === 'apple' ? 'Открываем…' : 'Продолжить с Apple'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  )
}
