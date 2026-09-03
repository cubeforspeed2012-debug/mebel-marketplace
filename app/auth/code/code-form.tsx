'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { sendCode, verifyCode, type CodeState } from './actions'

const EMPTY: CodeState = {}
const CELLS = 6

/** Замок в круге — как на макете: мягкая утопленная площадка, золотая скоба */
function LockBadge() {
  return (
    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-cream shadow-[inset_2px_2px_6px_rgba(0,0,0,0.45)]">
      <svg viewBox="0 0 24 24" className="size-7" fill="none" strokeWidth={1.8}
           stroke="var(--gold)" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
        <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      </svg>
    </div>
  )
}

/** Шаг 1 — куда слать код */
function RequestStep({
  role,
  action,
  pending,
  state,
}: {
  role: string
  action: (formData: FormData) => void
  pending: boolean
  state: CodeState
}) {
  return (
    <form action={action}>
      <input type="hidden" name="role" value={role} />

      <LockBadge />

      <h1 className="mt-6 display text-center text-2xl text-text">Вход по коду</h1>
      <p className="mt-2 text-center text-sm text-text-muted">
        Пришлём код на почту — пароль не нужен
      </p>

      <input
        name="email"
        type="email"
        required
        defaultValue={state.email ?? ''}
        placeholder=""
        aria-label="Почта"
        className="mt-8 w-full rounded-2xl border border-line bg-cream px-5 py-4 text-center text-text outline-none transition-shadow duration-200 placeholder:text-text-muted focus:shadow-[0_0_0_2px_var(--gold)]"
      />

      {state.error && (
        <p className="mt-4 text-center text-sm text-status-error">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="press mt-6 w-full rounded-2xl bg-gold py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_22px_rgba(138,112,83,0.45)] hover:bg-gold-deep transition-opacity duration-200 disabled:opacity-60"
      >
        {pending ? 'Отправляем…' : 'Прислать код'}
      </button>
    </form>
  )
}

/** Шаг 2 — ячейки кода */
function VerifyStep({
  email,
  action,
  pending,
  state,
}: {
  email: string
  action: (formData: FormData) => void
  pending: boolean
  state: CodeState
}) {
  const [digits, setDigits] = useState<string[]>(Array(CELLS).fill(''))
  const [seconds, setSeconds] = useState(30)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (seconds <= 0) return
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, '')
    const next = [...digits]

    if (clean.length > 1) {
      // вставили код целиком — разложим по ячейкам
      clean.split('').slice(0, CELLS).forEach((char, i) => {
        next[i] = char
      })
      setDigits(next)
      inputs.current[Math.min(clean.length, CELLS - 1)]?.focus()
      return
    }

    next[index] = clean
    setDigits(next)
    if (clean && index < CELLS - 1) inputs.current[index + 1]?.focus()
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const code = digits.join('')

  return (
    <form action={action}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="code" value={code} />

      <LockBadge />

      <h1 className="mt-6 display text-center text-2xl text-text">Подтвердите вход</h1>
      <p className="mt-2 text-center text-sm text-text-muted">Мы отправили код на</p>
      <p className="mt-1 text-center font-semibold text-text">{email}</p>

      <div className="mt-8 flex justify-center gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputs.current[index] = el
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CELLS}
            value={digit}
            aria-label={`Цифра ${index + 1}`}
            onChange={(e) => setDigit(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            className={`size-12 rounded-2xl text-center text-xl font-semibold outline-none transition-shadow duration-200 sm:size-14 ${
              digit
                ? 'border border-gold bg-gold-soft text-text shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5)]'
                : 'border border-line bg-paper text-text shadow-[0_3px_10px_rgba(0,0,0,0.4)]'
            } focus:shadow-[0_0_0_2px_var(--gold)]`}
          />
        ))}
      </div>

      {state.error && (
        <p className="mt-5 text-center text-sm text-status-error">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || code.length < 4}
        className="press mt-8 w-full rounded-2xl bg-gold py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_22px_rgba(138,112,83,0.45)] hover:bg-gold-deep transition-opacity duration-200 disabled:opacity-45"
      >
        {pending ? 'Проверяем…' : 'Подтвердить код'}
      </button>

      <div className="mt-6 flex items-center justify-center gap-3 text-sm">
        {seconds > 0 ? (
          <>
            <span className="size-4 animate-spin rounded-full border border-gold border-t-transparent" />
            <span className="text-text-muted">
              Отправить снова через <span className="text-text">{seconds}с</span>
            </span>
          </>
        ) : (
          <Link href="/auth/code" className="text-gold hover:underline">
            Отправить код заново
          </Link>
        )}
      </div>
    </form>
  )
}

export function CodeForm({ role }: { role: 'seller' | 'buyer' }) {
  const [sendState, sendAction, sending] = useActionState(sendCode, EMPTY)
  const [verifyState, verifyAction, verifying] = useActionState(verifyCode, EMPTY)

  const sent = sendState.sent || verifyState.sent
  const email = verifyState.email ?? sendState.email ?? ''

  return (
    <div className="rounded-[28px] border border-line bg-paper p-7 shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:p-9">
      {sent ? (
        <VerifyStep
          email={email}
          action={verifyAction}
          pending={verifying}
          state={verifyState}
        />
      ) : (
        <RequestStep role={role} action={sendAction} pending={sending} state={sendState} />
      )}

      <p className="mt-7 text-center text-sm text-text-muted">
        <Link href="/auth" className="hover:text-text">
          Войти с паролем
        </Link>
      </p>
    </div>
  )
}
