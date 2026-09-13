'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useDict } from '@/components/locale-provider'
import { LOCALE_COOKIE } from '@/lib/i18n'

function Segmented({
  options,
  value,
  onChange,
  busy = false,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  busy?: boolean
}) {
  return (
    <div className={`flex gap-1 rounded-full bg-cream p-1 ${busy ? 'opacity-60' : ''}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`press flex-1 rounded-full px-4 py-2 text-sm transition-colors duration-200 ${
            value === option.value ? 'bg-gold font-semibold text-white' : 'text-text-muted'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Язык приложения — меняется сразу, запоминается на год. */
export function LanguageSetting() {
  const dict = useDict()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(locale: string) {
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <Segmented
      busy={pending}
      value={dict.code}
      onChange={choose}
      options={[
        { value: 'ru', label: 'Русский' },
        { value: 'uz', label: "O'zbekcha" },
      ]}
    />
  )
}

/** Оформление — тёмное или светлое. */
export function ThemeSetting({ initial }: { initial: 'dark' | 'light' }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(initial)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#ffffff' : '#0f0f0f')
  }, [theme])

  function choose(next: string) {
    const value = next === 'light' ? 'light' : 'dark'
    setTheme(value)
    document.cookie = `theme=${value};path=/;max-age=31536000;samesite=lax`
  }

  return (
    <Segmented
      value={theme}
      onChange={choose}
      options={[
        { value: 'dark', label: 'Тёмное' },
        { value: 'light', label: 'Светлое' },
      ]}
    />
  )
}

/** Удаление аккаунта: подтверждение обязательно, вернуть данные нельзя. */
export function DeleteAccount({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const ok = window.confirm(
          'Удалить аккаунт?\n\nВместе с ним удалятся мастерская, работы, заказы и клиенты. Восстановить это будет нельзя.',
        )
        if (!ok) event.preventDefault()
      }}
    >
      <button
        type="submit"
        className="press w-full rounded-2xl bg-status-error/15 py-3.5 text-sm font-semibold text-status-error transition-colors hover:bg-status-error/25"
      >
        Удалить аккаунт
      </button>
    </form>
  )
}
