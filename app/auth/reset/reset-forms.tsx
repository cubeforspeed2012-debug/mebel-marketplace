'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { requestReset, setNewPassword, type ResetState } from './actions'

const EMPTY: ResetState = {}

function Notice({ state }: { state: ResetState }) {
  if (state.error) {
    return (
      <p className="mt-4 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    )
  }
  if (state.message) {
    return <p className="mt-4 border border-line bg-cream px-3 py-2 text-sm">{state.message}</p>
  }
  return null
}

/** Шаг 1: попросить письмо со ссылкой. */
export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestReset, EMPTY)

  return (
    <form action={action} className="border border-line bg-paper p-8">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Почта, на которую регистрировались
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="mebel@mail.uz"
          className="w-full border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
        />
      </label>

      <Notice state={state} />

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full bg-gold px-6 py-3 font-semibold text-ink transition-colors hover:bg-ink hover:text-gold disabled:opacity-60"
      >
        {pending ? 'Отправляем…' : 'Прислать ссылку'}
      </button>

      <p className="mt-4 text-center text-sm">
        <Link href="/auth" className="text-gold-deep hover:underline">
          Вспомнил пароль — войти
        </Link>
      </p>
    </form>
  )
}

/** Шаг 2: задать новый пароль после перехода по ссылке из письма. */
export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, EMPTY)

  if (state.message) {
    return (
      <div className="border border-line bg-paper p-8 text-center">
        <p>{state.message}</p>
        <Link
          href="/auth"
          className="mt-6 inline-block bg-gold px-6 py-3 font-semibold text-ink transition-colors hover:bg-ink hover:text-gold"
        >
          Войти
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="border border-line bg-paper p-8">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Новый пароль
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="минимум 6 символов"
          className="w-full border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
        />
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Ещё раз
        </span>
        <input
          name="repeat"
          type="password"
          required
          autoComplete="new-password"
          className="w-full border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
        />
      </label>

      <Notice state={state} />

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full bg-gold px-6 py-3 font-semibold text-ink transition-colors hover:bg-ink hover:text-gold disabled:opacity-60"
      >
        {pending ? 'Сохраняем…' : 'Сохранить пароль'}
      </button>
    </form>
  )
}
