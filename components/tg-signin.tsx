'use client'

import { useActionState } from 'react'
import { signIn, type AuthState } from '@/app/auth/actions'
import { OAuthButtons } from '@/components/oauth-buttons'
import { PasswordInput } from '@/components/password-input'
import { TgOpenOutside } from '@/components/tg-open-outside'

const EMPTY: AuthState = {}

/**
 * Вход в мини-приложение. Именно вход, не регистрация.
 *
 * Регистрация — дело большого сайта: там мастер заводит мастерскую,
 * грузит фото работ, указывает район. В окошке Telegram это не помещается,
 * а начатая и брошенная на полпути регистрация хуже, чем её отсутствие.
 * Поэтому здесь только две двери: войти через Google или по почте,
 * а зарегистрироваться — ссылкой на сайт, которая откроется браузером.
 */
export function TgSignIn() {
  const [state, action, pending] = useActionState(signIn, EMPTY)

  return (
    <div className="rounded-[28px] border border-line bg-paper p-6">
      <OAuthButtons next="/tg" solo />

      <div className="my-5 flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.14em] text-text-muted">
        <span className="h-px flex-1 bg-line" />
        или по почте
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value="/tg" />

        <label className="block">
          <span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Почта
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-line bg-cream px-5 py-3.5 text-text outline-none transition-shadow duration-200 focus:shadow-[0_0_0_2px_var(--gold)]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Пароль
          </span>
          <PasswordInput className="w-full rounded-2xl border border-line bg-cream px-5 py-3.5 text-text outline-none transition-shadow duration-200 focus:shadow-[0_0_0_2px_var(--gold)]" />
        </label>

        {state.error && (
          <p className="rounded-xl border border-[#b91c1c]/40 bg-[#b91c1c]/15 px-4 py-3 text-sm text-status-error">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="press w-full rounded-2xl bg-gold py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_22px_rgba(138,112,83,0.45)] transition-opacity duration-200 hover:bg-gold-deep disabled:opacity-60"
        >
          {pending ? 'Входим…' : 'Войти'}
        </button>
      </form>

      <div className="mt-6 rounded-2xl bg-cream px-4 py-3 text-center text-sm leading-relaxed text-text-muted">
        Ещё нет мастерской?
        <br />
        <TgOpenOutside path="/auth" className="font-semibold text-gold underline">
          Зарегистрируйтесь на сайте
        </TgOpenOutside>
        <br />
        <span className="text-xs">Откроется браузером — здесь регистрации нет</span>
      </div>
    </div>
  )
}
