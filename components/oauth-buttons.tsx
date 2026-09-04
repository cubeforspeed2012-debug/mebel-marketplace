'use client'

import { useState } from 'react'
import { useDict } from '@/components/locale-provider'
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

/**
 * Вход через Google. Провайдер включается в панели Supabase —
 * если он не настроен, показываем понятную подсказку, а не ошибку.
 */
export function OAuthButtons({ next = '/dashboard' }: { next?: string }) {
  const dict = useDict()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function signInWithGoogle() {
    setError(null)
    setBusy(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })

      if (authError) {
        setError(
          /not enabled|unsupported|provider/i.test(authError.message)
            ? dict.auth.googleOff
            : authError.message,
        )
        setBusy(false)
      }
      // При успехе браузер уходит на страницу Google — состояние не сбрасываем.
    } catch {
      setError(dict.auth.googleFailed)
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-widest text-text-muted">
        <span className="h-px flex-1 bg-line" />
        {dict.auth.or}
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 border border-line px-5 py-2.5 font-medium transition-colors hover:border-gold disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? dict.auth.googleOpening : dict.auth.google}
      </button>

      {error && <p className="mt-3 text-sm text-status-error">{error}</p>}
    </div>
  )
}
