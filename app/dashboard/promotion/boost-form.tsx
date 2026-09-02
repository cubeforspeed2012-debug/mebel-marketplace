'use client'

import { useActionState } from 'react'
import { formatPrice } from '@/lib/constants'
import { BOOST_PLANS, requestBoost, type FormState } from './actions'

const EMPTY: FormState = {}

export function BoostForm({ products }: { products: { id: number; title: string }[] }) {
  const [state, action, pending] = useActionState(requestBoost, EMPTY)

  return (
    <form action={action} className="border border-line bg-paper p-6">
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Тариф
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(BOOST_PLANS).map(([key, plan], index) => (
            <label key={key} className="cursor-pointer">
              <input
                type="radio"
                name="plan"
                value={key}
                defaultChecked={index === 0}
                className="peer sr-only"
              />
              <span className="block border border-line p-4 transition-colors peer-checked:border-gold peer-checked:bg-gold/10">
                <span className="block font-semibold">{plan.label}</span>
                <span className="display mt-2 block text-lg text-gold-deep">
                  {formatPrice(plan.amount)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Что поднимаем
        </span>
        <select
          name="product_id"
          className="w-full border border-line bg-paper px-4 py-2.5 outline-none focus:border-gold sm:max-w-md"
        >
          <option value="">Всю мастерскую</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.title}
            </option>
          ))}
        </select>
      </label>

      {state.error && (
        <p className="mt-5 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="mt-5 border border-line bg-cream px-3 py-2 text-sm">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 bg-gold px-7 py-3 font-semibold text-ink transition-colors hover:bg-ink hover:text-gold disabled:opacity-60"
      >
        {pending ? 'Отправляем…' : 'Заказать продвижение'}
      </button>
    </form>
  )
}
