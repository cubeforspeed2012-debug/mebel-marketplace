'use client'

import { useActionState, useState } from 'react'
import { ImageUpload } from '@/components/image-upload'
import { DISTRICTS, WORK_TYPES } from '@/lib/constants'
import type { Company } from '@/lib/types'
import { saveCompany, type FormState } from './actions'

const EMPTY: FormState = {}

export function CompanyForm({ company }: { company: Company | null }) {
  const [state, action, pending] = useActionState(saveCompany, EMPTY)
  const [logo, setLogo] = useState<string | null>(company?.logo_url ?? null)

  return (
    <form action={action} className="space-y-6 rounded-[var(--radius)] border border-line bg-paper p-6">
      <input type="hidden" name="logo_url" value={logo ?? ''} />

      <ImageUpload value={logo} onChange={setLogo} label="Логотип мастерской" />

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Название мастерской
        </span>
        <input
          name="name"
          required
          defaultValue={company?.name ?? ''}
          placeholder="Например: Rich Kitchen"
          className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Телефон для клиентов
        </span>
        <input
          name="phone_public"
          required
          type="tel"
          defaultValue={company?.phone_public ?? ''}
          placeholder="+998 90 123-45-67"
          className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
        />
        <span className="mt-1 block text-xs text-text-muted">
          Этот номер увидят покупатели — на него пойдут звонки
        </span>
      </label>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Чем занимаетесь
        </legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(WORK_TYPES).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="work_type"
                value={value}
                defaultChecked={(company?.work_type ?? 'both') === value}
                className="peer sr-only"
              />
              <span className="block border border-line px-4 py-2 text-sm transition-colors peer-checked:border-gold peer-checked:bg-gold peer-checked:font-semibold peer-checked:text-white">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          О мастерской
        </span>
        <textarea
          name="description"
          rows={4}
          defaultValue={company?.description ?? ''}
          placeholder="Сколько лет работаете, что делаете лучше всего, какие материалы используете"
          className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Район Ташкента
          </span>
          <select
            name="district"
            defaultValue={company?.district ?? ''}
            className="w-full rounded-[var(--radius)] border border-line bg-paper px-4 py-2.5 outline-none transition-colors focus:border-gold"
          >
            <option value="">Не указан</option>
            {DISTRICTS.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Адрес или ориентир
          </span>
          <input
            name="address"
            defaultValue={company?.address ?? ''}
            placeholder="Необязательно"
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Instagram
          </span>
          <input
            name="instagram"
            defaultValue={company?.instagram ?? ''}
            placeholder="username"
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Telegram
          </span>
          <input
            name="telegram"
            defaultValue={company?.telegram ?? ''}
            placeholder="username"
            className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none transition-colors focus:border-gold"
          />
        </label>
      </div>

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
        className="bg-gold px-7 py-3 font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-60"
      >
        {pending ? 'Сохраняем…' : company ? 'Сохранить' : 'Создать мастерскую'}
      </button>
    </form>
  )
}
