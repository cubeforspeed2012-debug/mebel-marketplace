'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { OAuthButtons } from '@/components/oauth-buttons'
import { signIn, signUp, type AuthState } from './actions'

const EMPTY: AuthState = {}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required = true,
  hint,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={
          type === 'password' ? 'current-password' : name === 'email' ? 'email' : 'on'
        }
        className="w-full rounded-[var(--radius)] border border-line bg-paper px-4 py-2.5 outline-none transition-colors focus:border-gold"
      />
      {hint && <span className="mt-1 block text-xs text-text-muted">{hint}</span>}
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
  // Покупатель приходит с кнопки «Купить мебель» — ему сразу нужна регистрация.
  const [mode, setMode] = useState<'in' | 'up'>(role === 'buyer' ? 'up' : 'in')
  const [signInState, signInAction, signingIn] = useActionState(signIn, EMPTY)
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, EMPTY)

  const isLogin = mode === 'in'
  const state = isLogin ? signInState : signUpState
  const pending = isLogin ? signingIn : signingUp

  return (
    <div className="mx-auto w-full max-w-md rounded-[var(--radius)] border border-line bg-paper p-8">
      <div className="mb-7 flex border border-line">
        <button
          type="button"
          onClick={() => setMode('in')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${
            isLogin ? 'bg-gold text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => setMode('up')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${
            !isLogin ? 'bg-gold text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Регистрация
        </button>
      </div>

      {isLogin ? (
        <form action={signInAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Почта" name="email" type="email" placeholder="mebel@mail.uz" />
          <Field label="Пароль" name="password" type="password" placeholder="••••••" />

          {state.error && (
            <p className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-60"
          >
            {pending ? 'Входим…' : 'Войти'}
          </button>

          <p className="text-center text-sm">
            <Link href="/auth/reset" className="text-text-muted hover:text-gold-deep">
              Забыли пароль?
            </Link>
          </p>
        </form>
      ) : (
        <form action={signUpAction} className="space-y-4">
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
          <Field
            label="Пароль"
            name="password"
            type="password"
            placeholder="минимум 6 символов"
          />

          {state.error && (
            <p className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="border border-line bg-cream px-3 py-2 text-sm">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-60"
          >
            {pending ? 'Создаём…' : 'Создать кабинет'}
          </button>

          <p className="text-xs leading-relaxed text-text-muted">
            {role === 'buyer'
              ? 'Регистрация бесплатная. Ваши заявки мастерам будут собираться в одном месте — не потеряете, к кому обращались.'
              : 'Регистрация бесплатная. После неё заполните профиль мастерской — и вас увидят в каталоге.'}
          </p>
        </form>
      )}

      <div className="mt-7">
        <OAuthButtons next={next} />
      </div>
    </div>
  )
}
