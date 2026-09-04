'use client'

import { useActionState } from 'react'
import { saveProfile, type ProfileState } from './actions'

const EMPTY: ProfileState = {}

export function ProfileForm({
  fullName,
  phone,
}: {
  fullName: string
  phone: string
}) {
  const [state, action, pending] = useActionState(saveProfile, EMPTY)

  return (
    <form action={action} className="rounded-3xl bg-paper p-6">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Имя
        </span>
        <input
          name="full_name"
          defaultValue={fullName}
          required
          maxLength={60}
          className="w-full rounded-2xl bg-cream px-5 py-3.5 text-text outline-none transition-shadow duration-200 focus:shadow-[0_0_0_2px_var(--gold)]"
        />
        <span className="mt-1.5 block text-xs text-text-muted">
          Это имя видят люди, с которыми вы общаетесь на площадке
        </span>
      </label>

      <label className="mt-5 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Телефон
        </span>
        <input
          name="phone"
          type="tel"
          defaultValue={phone}
          inputMode="tel"
          className="w-full rounded-2xl bg-cream px-5 py-3.5 text-text outline-none transition-shadow duration-200 focus:shadow-[0_0_0_2px_var(--gold)]"
        />
      </label>

      {state.error && (
        <p className="mt-5 rounded-2xl bg-status-error/15 px-4 py-3 text-sm text-status-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="mt-5 rounded-2xl bg-status-done/15 px-4 py-3 text-sm text-status-done">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="press mt-6 w-full rounded-full bg-gold py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {pending ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </form>
  )
}
