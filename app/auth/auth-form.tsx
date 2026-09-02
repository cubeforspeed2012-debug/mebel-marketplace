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
      <span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[#8b93a7]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : name === 'email' ? 'email' : 'on'}
        className="w-full rounded-2xl border border-white/5 bg-[#161d31] px-5 py-3.5 text-white outline-none transition-shadow duration-200 placeholder:text-[#5b6478] focus:shadow-[0_0_0_2px_rgba(200,164,92,0.6)]"
      />
      {hint && <span className="mt-1.5 block text-xs text-[#6f7891]">{hint}</span>}
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
    <div className="rounded-[28px] border border-white/[0.06] bg-[#171e30] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:p-9">
      {/* Переключатель: утопленная дорожка, приподнятая активная половина */}
      <div className="mb-8 flex rounded-2xl bg-[#141b2d] p-1.5 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.6),inset_-2px_-2px_6px_rgba(255,255,255,0.03)]">
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
                ? 'bg-[#1f2840] text-white shadow-[3px_3px_10px_rgba(0,0,0,0.45),-2px_-2px_8px_rgba(255,255,255,0.03)]'
                : 'text-[#8b93a7] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLogin ? (
        <form action={signInAction} className="space-y-5">
          <input type="hidden" name="next" value={next} />
          <Field label="Почта" name="email" type="email" placeholder="mebel@mail.uz" />
          <Field label="Пароль" name="password" type="password" placeholder="••••••" />

          {state.error && (
            <p className="rounded-xl bg-[#2a1a1f] px-4 py-3 text-sm text-[#e08a8a]">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="press w-full rounded-2xl bg-[#1b2338] py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[4px_4px_12px_rgba(0,0,0,0.5),-3px_-3px_10px_rgba(255,255,255,0.03)] transition-opacity duration-200 disabled:opacity-60"
          >
            {pending ? 'Входим…' : 'Войти'}
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link href="/auth/code" className="text-[#c8a45c] hover:underline">
              Войти по коду
            </Link>
            <Link href="/auth/reset" className="text-[#8b93a7] hover:text-white">
              Забыли пароль?
            </Link>
          </div>
        </form>
      ) : (
        <form action={signUpAction} className="space-y-5">
          <input type="hidden" name="role" value={role} />

          <Field label="Ваше имя" name="full_name" placeholder="Бобур" />
          <Field
            label="Телефон"
            name="phone"
            type="tel"
            placeholder="+998 90 123-45-67"
            hint={
              role === 'buyer'
                ? 'По нему мастер свяжется с вами по заявке'
                : 'По нему с вами будут связываться клиенты'
            }
          />
          <Field label="Почта" name="email" type="email" placeholder="mebel@mail.uz" />
          <Field label="Пароль" name="password" type="password" placeholder="минимум 6 символов" />

          {state.error && (
            <p className="rounded-xl bg-[#2a1a1f] px-4 py-3 text-sm text-[#e08a8a]">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="rounded-xl bg-[#16223a] px-4 py-3 text-sm text-[#a9b4cc]">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="press w-full rounded-2xl bg-[#1b2338] py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[4px_4px_12px_rgba(0,0,0,0.5),-3px_-3px_10px_rgba(255,255,255,0.03)] transition-opacity duration-200 disabled:opacity-60"
          >
            {pending ? 'Создаём…' : 'Создать кабинет'}
          </button>

          <p className="text-center text-xs leading-relaxed text-[#6f7891]">
            {role === 'buyer'
              ? 'Регистрация бесплатная. Все заявки мастерам — в одном месте.'
              : 'Регистрация бесплатная. Дальше заполните профиль мастерской.'}
          </p>
        </form>
      )}

      <div className="mt-8 [&_button]:rounded-2xl [&_button]:border-white/10 [&_button]:bg-[#1b2338] [&_button]:text-white [&_span]:bg-white/10">
        <OAuthButtons next={next} />
      </div>
    </div>
  )
}
