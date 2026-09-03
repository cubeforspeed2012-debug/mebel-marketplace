'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { OAuthButtons } from '@/components/oauth-buttons'
import { signIn, signUp, type AuthState } from './actions'

const EMPTY: AuthState = {}

/** Поле в тёмной карточке: утопленная площадка, золотая рамка в фокусе */
function Field({
  label,
  name,
  type = 'text',
  placeholder,
  hint,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : name === 'email' ? 'email' : 'on'}
        className="w-full rounded-2xl border border-line bg-cream px-5 py-3.5 text-text outline-none transition-shadow duration-200 placeholder:text-text-muted focus:shadow-[0_0_0_2px_var(--gold)]"
      />
      {hint && <span className="mt-1.5 block text-xs text-text-muted">{hint}</span>}
    </label>
  )
}

export function AuthForm({
  next,
  role = 'seller',
}: {
  next: string
  role?: 'seller' | 'buyer'
}) {
  const [mode, setMode] = useState<'in' | 'up'>(role === 'buyer' ? 'up' : 'in')
  const [signInState, signInAction, signingIn] = useActionState(signIn, EMPTY)
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, EMPTY)

  const isLogin = mode === 'in'
  const state = isLogin ? signInState : signUpState
  const pending = isLogin ? signingIn : signingUp

  return (
    <div className="rounded-[28px] border border-line bg-paper p-7 shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:p-9">
      {/* Переключатель: утопленная дорожка, приподнятая активная половина */}
      <div className="mb-8 flex rounded-2xl bg-cream p-1.5">
        {(
          [
            ['in', 'Вход'],
            ['up', 'Регистрация'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
              mode === value
                ? 'bg-gold text-white shadow-[0_6px_16px_rgba(138,112,83,0.4)]'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLogin ? (
        <form action={signInAction} className="space-y-5">
          <input type="hidden" name="next" value={next} />
          <Field label="Почта" name="email" type="email" placeholder="" />
          <Field label="Пароль" name="password" type="password" placeholder="" />

          {state.error && (
            <p className="rounded-xl border border-[#b91c1c]/40 bg-[#b91c1c]/15 px-4 py-3 text-sm text-status-error">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="press w-full rounded-2xl bg-gold py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_22px_rgba(138,112,83,0.45)] hover:bg-gold-deep transition-opacity duration-200 disabled:opacity-60"
          >
            {pending ? 'Входим…' : 'Войти'}
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link href="/auth/code" className="text-gold hover:underline">
              Войти по коду
            </Link>
            <Link href="/auth/reset" className="text-text-muted hover:text-text">
              Забыли пароль?
            </Link>
          </div>
        </form>
      ) : (
        <form action={signUpAction} className="space-y-5">
          <input type="hidden" name="role" value={role} />

          <Field label="Ваше имя" name="full_name" placeholder="" />
          <Field
            label="Телефон"
            name="phone"
            type="tel"
            placeholder=""
            hint={
              role === 'buyer'
                ? 'По нему мастер свяжется с вами по заявке'
                : 'По нему с вами будут связываться клиенты'
            }
          />
          <Field label="Почта" name="email" type="email" placeholder="" />
          <Field label="Пароль" name="password" type="password" placeholder="" />

          {state.error && (
            <p className="rounded-xl border border-[#b91c1c]/40 bg-[#b91c1c]/15 px-4 py-3 text-sm text-status-error">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="rounded-xl border border-line bg-cream px-4 py-3 text-sm text-text">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="press w-full rounded-2xl bg-gold py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_22px_rgba(138,112,83,0.45)] hover:bg-gold-deep transition-opacity duration-200 disabled:opacity-60"
          >
            {pending ? 'Создаём…' : 'Создать кабинет'}
          </button>

          <p className="text-center text-xs leading-relaxed text-text-muted">
            {role === 'buyer'
              ? 'Регистрация бесплатная. Все заявки мастерам — в одном месте.'
              : 'Регистрация бесплатная. Дальше заполните профиль мастерской.'}
          </p>
        </form>
      )}

      <div className="mt-8 [&_button]:rounded-2xl [&_button]:border-line [&_button]:bg-paper [&_button]:text-text [&_span]:bg-line">
        <OAuthButtons next={next} />
      </div>
    </div>
  )
}
