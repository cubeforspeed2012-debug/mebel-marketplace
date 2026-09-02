'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { sendCode, verifyCode, type CodeState } from './actions'

const EMPTY: CodeState = {}
const CELLS = 6

/** Замок в круге — как на макете: мягкая утопленная площадка, золотая скоба */
function LockBadge() {
  return (
    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#161d31] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.6),inset_-2px_-2px_6px_rgba(255,255,255,0.04)]">
      <svg viewBox="0 0 24 24" className="size-7" fill="none" strokeWidth={1.8}
           stroke="#c8a45c" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

      <h1 className="mt-6 text-center text-2xl font-bold text-white">Вход по коду</h1>
      <p className="mt-2 text-center text-sm text-[#8b93a7]">
        Пришлём код на почту — пароль не нужен
      </p>

      <input
        name="email"
        type="email"
        required
        defaultValue={state.email ?? ''}
        placeholder="mebel@mail.uz"
        aria-label="Почта"
        className="mt-8 w-full rounded-2xl border border-white/5 bg-[#161d31] px-5 py-4 text-center text-white outline-none transition-shadow duration-200 placeholder:text-[#5b6478] focus:shadow-[0_0_0_2px_rgba(200,164,92,0.6)]"
      />

      {state.error && (
        <p className="mt-4 text-center text-sm text-[#e08a8a]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="press mt-6 w-full rounded-2xl bg-[#1b2338] py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[4px_4px_12px_rgba(0,0,0,0.5),-3px_-3px_10px_rgba(255,255,255,0.03)] transition-opacity duration-200 disabled:opacity-60"
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

      <h1 className="mt-6 text-center text-2xl font-bold text-white">Подтвердите вход</h1>
      <p className="mt-2 text-center text-sm text-[#8b93a7]">Мы отправили код на</p>
      <p className="mt-1 text-center font-medium text-white">{email}</p>

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
            className={`size-12 rounded-2xl text-center text-xl font-semibold text-white outline-none transition-shadow duration-200 sm:size-14 ${
              digit
                ? 'bg-[#141b2d] shadow-[inset_3px_3px_8px_rgba(0,0,0,0.65),inset_-2px_-2px_6px_rgba(255,255,255,0.04)]'
                : 'bg-[#1b2338] shadow-[4px_4px_12px_rgba(0,0,0,0.5),-3px_-3px_10px_rgba(255,255,255,0.035)]'
            } focus:shadow-[0_0_0_2px_rgba(200,164,92,0.7)]`}
          />
        ))}
      </div>

      {state.error && (
        <p className="mt-5 text-center text-sm text-[#e08a8a]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || code.length < 4}
        className="press mt-8 w-full rounded-2xl bg-[#1b2338] py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[4px_4px_12px_rgba(0,0,0,0.5),-3px_-3px_10px_rgba(255,255,255,0.03)] transition-opacity duration-200 disabled:opacity-45"
      >
        {pending ? 'Проверяем…' : 'Подтвердить код'}
      </button>

      <div className="mt-6 flex items-center justify-center gap-3 text-sm">
        {seconds > 0 ? (
          <>
            <span className="size-4 animate-spin rounded-full border border-[#c8a45c] border-t-transparent" />
            <span className="text-[#8b93a7]">
              Отправить снова через <span className="text-white">{seconds}с</span>
            </span>
          </>
        ) : (
          <Link href="/auth/code" className="text-[#c8a45c] hover:underline">
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
    <div className="rounded-[28px] border border-white/[0.06] bg-[#171e30] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:p-9">
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

      <p className="mt-7 text-center text-sm text-[#8b93a7]">
        <Link href="/auth" className="hover:text-white">
          Войти с паролем
        </Link>
      </p>
    </div>
  )
}
