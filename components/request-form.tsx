'use client'

import { useActionState, useState } from 'react'
import { sendRequest, type RequestState } from '@/app/actions/request'

const EMPTY: RequestState = {}

/**
 * Заявка мастеру: запасной путь, если не дозвонились.
 * Открывается по кнопке, чтобы не отвлекать от главного действия — звонка.
 */
export function RequestForm({
  companyId,
  productId,
  compact = false,
}: {
  companyId: number
  productId?: number
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(sendRequest, EMPTY)

  if (state.message) {
    return (
      <div className="animate-fade rounded-[var(--radius)] border border-status-done bg-status-done/10 px-4 py-3 text-sm">
        {state.message}
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`press rounded-[var(--radius)] border border-line font-semibold transition-colors hover:border-gold hover:text-gold ${
          compact ? 'w-full px-6 py-3 text-center' : 'px-7 py-3'
        }`}
      >
        Написать заявку
      </button>
    )
  }

  return (
    <form action={action} className="w-full max-w-md rounded-[var(--radius)] border border-line bg-paper p-5 text-text">
      <input type="hidden" name="company_id" value={companyId} />
      {productId && <input type="hidden" name="product_id" value={productId} />}

      {/* Ловушка для спам-ботов: настоящий человек её не видит */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Заявка мастеру</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-text-muted hover:text-text"
        >
          Закрыть
        </button>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Ваше имя
          </span>
          <input
            name="name"
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
          <textarea
            name="message"
            rows={3}
            placeholder="Например: кухня 3 метра, фасады МДФ, нужен замер"
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none focus:border-gold"
          />
        </label>
      </div>

      {state.error && <p className="mt-3 text-sm text-status-error">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-60"
      >
        {pending ? 'Отправляем…' : 'Отправить заявку'}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-text-muted">
        Заявка уйдёт напрямую мастеру. Договариваетесь и оплачиваете вы с ним —
        площадка в сделке не участвует.
      </p>
    </form>
  )
}
