'use client'

import { useActionState, useState } from 'react'
import { completeProfile, type WelcomeState } from './actions'

const EMPTY: WelcomeState = {}

export function WelcomeForm({
  suggestedName,
  role: initialRole,
}: {
  suggestedName: string
  role: 'seller' | 'buyer'
}) {
  const [state, action, pending] = useActionState(completeProfile, EMPTY)
  const [role, setRole] = useState<'seller' | 'buyer'>(initialRole)

  return (
    <form
      action={action}
      className="rounded-[28px] border border-line bg-paper p-7 shadow-[0_18px_50px_rgba(59,51,43,0.10)] sm:p-9"
    >
      <label className="block">
        <span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Как вас зовут
        </span>
        <input
          name="full_name"
          defaultValue={suggestedName}
          required
          maxLength={60}
          autoFocus
          className="w-full rounded-2xl border border-line bg-cream px-5 py-3.5 text-text outline-none transition-shadow duration-200 focus:shadow-[0_0_0_2px_var(--gold)]"
        />
        <span className="mt-1.5 block text-xs text-text-muted">
          Это имя увидят люди, с которыми вы будете общаться на площадке
        </span>
      </label>

      <label className="mt-5 block">
        <span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Телефон
        </span>
        <input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          className="w-full rounded-2xl border border-line bg-cream px-5 py-3.5 text-text outline-none transition-shadow duration-200 focus:shadow-[0_0_0_2px_var(--gold)]"
        />
        <span className="mt-1.5 block text-xs text-text-muted">
          {role === 'seller'
            ? 'По нему с вами будут связываться клиенты'
            : 'По нему мастер свяжется с вами по заявке'}
        </span>
      </label>

      {/* Через Google не понять, мастер человек или покупатель — спрашиваем прямо */}
      <div className="mt-6">
        <span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Зачем вы здесь
        </span>
        <input type="hidden" name="role" value={role} />
        <div className="flex rounded-2xl bg-cream p-1.5">
          {(
            [
              ['buyer', 'Ищу мебель'],
              ['seller', 'Делаю мебель'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                role === value
                  ? 'bg-gold text-white shadow-[0_6px_16px_rgba(138,112,83,0.4)]'
                  : 'text-text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {state.error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="press mt-7 w-full rounded-2xl bg-gold py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_22px_rgba(138,112,83,0.45)] transition-opacity duration-200 hover:bg-gold-deep disabled:opacity-60"
      >
        {pending ? 'Сохраняем…' : 'Продолжить'}
      </button>
    </form>
  )
}
