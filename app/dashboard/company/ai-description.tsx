'use client'

import { useState, useTransition } from 'react'
import { WORK_TYPES } from '@/lib/constants'
import { suggestDescription, type DescriptionState } from './ai-actions'

function Small({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-cream px-4 py-2.5 text-sm text-text outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--gold)]"
      />
    </label>
  )
}

/**
 * Помощник для текста «О мастерской». Мастеру трудно писать о себе с чистого листа,
 * зато он легко отвечает на конкретные вопросы — из ответов и собираем текст.
 * Готовый текст не подставляется молча: человек сначала читает и решает сам.
 */
export function AiDescription({
  companyName,
  workType,
  onUse,
}: {
  companyName: string
  workType: string
  onUse: (text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<DescriptionState>({})
  const [pending, startTransition] = useTransition()

  const [years, setYears] = useState('')
  const [makes, setMakes] = useState('')
  const [materials, setMaterials] = useState('')
  const [warranty, setWarranty] = useState('')
  const [extra, setExtra] = useState('')

  function write() {
    const data = new FormData()
    data.set('name', companyName)
    data.set('work_type', workType)
    data.set('years', years)
    data.set('makes', makes)
    data.set('materials', materials)
    data.set('warranty', warranty)
    data.set('extra', extra)

    startTransition(async () => {
      setState(await suggestDescription({}, data))
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press mt-2 inline-flex items-center gap-2 rounded-full bg-sand px-4 py-2 text-sm text-text transition-colors hover:bg-gold hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <path d="M12 2.5 13.8 8l5.7 1.8-5.7 1.8L12 17l-1.8-5.4L4.5 9.8 10.2 8 12 2.5ZM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14Z" />
        </svg>
        Помочь с текстом
      </button>
    )
  }

  return (
    <div className="animate-fade mt-3 rounded-3xl bg-cream p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-text">Помощник напишет за вас</div>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">
            Ответьте коротко — помощник соберёт из этого нормальный текст. Заполнять всё
            не обязательно.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-sm text-text-muted hover:text-text"
        >
          Закрыть
        </button>
      </div>

      {/* Не форма: этот блок живёт внутри формы профиля, вложенные формы браузер не пускает */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Small
          label="Сколько лет работаете"
          placeholder="7 лет"
          value={years}
          onChange={setYears}
        />
        <Small
          label="Что делаете чаще всего"
          placeholder="кухни и шкафы-купе"
          value={makes}
          onChange={setMakes}
        />
        <Small
          label="Материалы"
          placeholder="МДФ, ЛДСП Egger, фурнитура Blum"
          value={materials}
          onChange={setMaterials}
        />
        <Small
          label="Гарантия"
          placeholder="2 года на фурнитуру"
          value={warranty}
          onChange={setWarranty}
        />

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Что ещё важно знать
          </span>
          <textarea
            rows={2}
            value={extra}
            onChange={(event) => setExtra(event.target.value)}
            placeholder="Бесплатный замер по городу, свой цех, делаем за 3 недели"
            className="w-full rounded-2xl bg-paper px-4 py-2.5 text-sm text-text outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--gold)]"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={write}
            disabled={pending}
            className="press rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-60"
          >
            {pending ? 'Пишем…' : 'Написать текст'}
          </button>
        </div>
      </div>

      {state.error && (
        <p className="mt-4 rounded-2xl bg-status-error/15 px-4 py-3 text-sm text-status-error">
          {state.error}
        </p>
      )}

      {state.text && (
        <div className="animate-fade mt-4 rounded-2xl bg-paper p-4">
          <p className="whitespace-pre-line leading-relaxed text-text">{state.text}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onUse(state.text ?? '')
                setOpen(false)
              }}
              className="press rounded-full bg-gold px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-deep"
            >
              Вставить в профиль
            </button>
            <span className="self-center text-xs text-text-muted">
              Перечитайте и поправьте — это ваш текст, а не помощника
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
