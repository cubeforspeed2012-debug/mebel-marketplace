'use client'

import { useState, useTransition } from 'react'
import { suggestDescription, type DescriptionState } from './ai-actions'

/* Готовые ответы на то, что покупатель в Ташкенте спрашивает первым делом.
   Мастеру быстрее нажать, чем печатать, а профиль от этого сразу крепче. */
const ADVANTAGES = [
  'Бесплатный замер',
  'Доставка и установка',
  'Работаем по договору',
  'Свой цех',
  '3D-проект до заказа',
  'Рассрочка',
  'Выезд по всему Ташкенту',
  'Гарантийное обслуживание',
]

function Field({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string
  hint?: string
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
      {hint && <span className="mt-1 block text-xs text-text-muted">{hint}</span>}
    </label>
  )
}

/**
 * Помощник для профиля мастерской.
 *
 * Вопросы подобраны не «чтобы был текст», а по тому, что покупатель мебели
 * в Ташкенте выясняет перед звонком: сроки, гарантия, замер, от какой цены.
 * Ответы идут и в текст, и в советы — где профиль ещё дырявый.
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
  const [term, setTerm] = useState('')
  const [priceFrom, setPriceFrom] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [extra, setExtra] = useState('')

  function toggle(item: string) {
    setChosen((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    )
  }

  /*
   * Вставка должна быть видимой: текст уходит в поле профиля, помощник
   * закрывается, страница прокручивается к этому полю и оно на миг
   * подсвечивается. Иначе человек нажимает и не понимает, сработало ли.
   */
  function use() {
    onUse(state.text ?? '')
    setOpen(false)

    requestAnimationFrame(() => {
      const field = document.getElementById('company-description')
      if (!field) return

      field.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field.classList.add('flash')
      setTimeout(() => field.classList.remove('flash'), 1200)
    })
  }

  function write() {
    const data = new FormData()
    data.set('name', companyName)
    data.set('work_type', workType)
    data.set('years', years)
    data.set('makes', makes)
    data.set('materials', materials)
    data.set('warranty', warranty)
    data.set('term', term)
    data.set('price_from', priceFrom)
    data.set('advantages', chosen.join(', '))
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
            Это то, что покупатель выясняет перед звонком. Ответьте коротко — помощник
            соберёт текст и подскажет, что ещё добавить, чтобы звонили чаще.
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

      {/* Не форма: блок живёт внутри формы профиля, вложенные формы браузер не пускает */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Сколько лет работаете"
          placeholder="7 лет"
          value={years}
          onChange={setYears}
        />
        <Field
          label="Что делаете чаще всего"
          hint="Чем уже специализация, тем охотнее звонят"
          placeholder="кухни и шкафы-купе"
          value={makes}
          onChange={setMakes}
        />
        <Field
          label="Материалы и фурнитура"
          hint="Названия брендов внушают доверие"
          placeholder="МДФ, ЛДСП Egger, фурнитура Blum"
          value={materials}
          onChange={setMaterials}
        />
        <Field
          label="Гарантия"
          placeholder="2 года на фурнитуру"
          value={warranty}
          onChange={setWarranty}
        />
        <Field
          label="Срок изготовления"
          hint="Первый вопрос почти каждого клиента"
          placeholder="3 недели на кухню"
          value={term}
          onChange={setTerm}
        />
        <Field
          label="Цена от"
          hint="Отсекает тех, кто искал дешевле — вам меньше пустых звонков"
          placeholder="от 4 000 000 сум за погонный метр"
          value={priceFrom}
          onChange={setPriceFrom}
        />

        <div className="sm:col-span-2">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Что входит — нажмите на своё
          </span>
          <div className="flex flex-wrap gap-2">
            {ADVANTAGES.map((item) => {
              const active = chosen.includes(item)

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggle(item)}
                  aria-pressed={active}
                  className={`press rounded-full px-4 py-2 text-sm transition-colors duration-200 ${
                    active
                      ? 'bg-gold font-semibold text-white'
                      : 'bg-paper text-text-muted hover:text-text'
                  }`}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </div>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Что ещё важно знать
          </span>
          <textarea
            rows={2}
            value={extra}
            onChange={(event) => setExtra(event.target.value)}
            placeholder="Делаем сложные угловые кухни, работаем с дизайнерами, есть свой сборщик"
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
            {pending ? 'Пишем…' : 'Написать текст и советы'}
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
          <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Текст о мастерской
          </div>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-text">{state.text}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={use}
              className="press rounded-full bg-gold px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-deep"
            >
              Вставить в профиль
            </button>
            <button
              type="button"
              onClick={write}
              disabled={pending}
              className="press rounded-full bg-cream px-5 py-2 text-sm text-text transition-colors hover:bg-sand disabled:opacity-60"
            >
              Другой вариант
            </button>
            <span className="text-xs text-text-muted">
              Перечитайте и поправьте — это ваш текст, а не помощника
            </span>
          </div>
        </div>
      )}

      {state.tips && state.tips.length > 0 && (
        <div className="animate-fade mt-3 rounded-2xl bg-paper p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold">
            Чтобы звонили чаще
          </div>
          <ul className="mt-3 space-y-2.5">
            {state.tips.map((tip, index) => (
              <li key={tip} className="flex gap-3 text-sm leading-relaxed text-text">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-gold">
                  {index + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
