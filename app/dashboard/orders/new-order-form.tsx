'use client'

import { useActionState, useState } from 'react'
import { ORDER_SOURCES } from '@/lib/orders'
import { createOrder, type FormState } from './actions'

const EMPTY: FormState = {}

/** Быстрое добавление заказа руками — клиент позвонил или написал в Instagram. */
export function NewOrderForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(createOrder, EMPTY)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-gold px-6 py-2.5 font-semibold text-white transition-colors hover:bg-gold-deep"
      >
        Добавить заказ
      </button>
    )
  }

  return (
    <form action={action} className="w-full rounded-[var(--radius)] border border-line bg-paper p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Новый заказ</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-text-muted hover:text-text"
        >
          Закрыть
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Имя клиента
          </span>
          <input
            name="full_name"
            required
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none focus:border-gold"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Телефон
          </span>
          <input
            name="phone"
            type="tel"
            required
            placeholder="+998 90 123-45-67"
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none focus:border-gold"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Что нужно
          </span>
          <input
            name="title"
            placeholder="Кухня на заказ"
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none focus:border-gold"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Откуда пришёл
          </span>
          <select
            name="source"
            defaultValue="phone"
            className="w-full rounded-[var(--radius)] border border-line bg-paper px-4 py-2.5 outline-none focus:border-gold"
          >
            {Object.entries(ORDER_SOURCES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Заметка
          </span>
          <textarea
            name="comment"
            rows={2}
            placeholder="Размеры, пожелания, договорённости"
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none focus:border-gold"
          />
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Тип
        </legend>
        <div className="flex gap-2">
          {[
            ['custom', 'На заказ'],
            ['ready_made', 'Готовая'],
          ].map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="type"
                value={value}
                defaultChecked={value === 'custom'}
                className="peer sr-only"
              />
              <span className="block border border-line px-4 py-2 text-sm transition-colors peer-checked:border-gold peer-checked:bg-gold peer-checked:font-semibold peer-checked:text-white">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && <p className="mt-4 text-sm text-status-error">{state.error}</p>}
      {state.message && <p className="mt-4 text-sm text-gold-deep">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 bg-gold px-6 py-2.5 font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-60"
      >
        {pending ? 'Добавляем…' : 'Добавить'}
      </button>
    </form>
  )
}
