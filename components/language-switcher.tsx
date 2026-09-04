'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useDict } from '@/components/locale-provider'
import { LOCALE_COOKIE, LOCALES } from '@/lib/i18n'

const LABELS: Record<string, string> = { ru: 'Рус', uz: "O'zb" }

/**
 * Переключатель языка. Язык храним в куке на год: адреса страниц
 * не меняются, ссылками можно делиться, и человек попадает на свой язык.
 */
export function LanguageSwitcher({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const dict = useDict()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(locale: string) {
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full p-0.5 ${
        tone === 'dark' ? 'bg-white/8' : 'bg-cream'
      } ${pending ? 'opacity-60' : ''}`}
    >
      {LOCALES.map((locale) => {
        const active = dict.code === locale

        return (
          <button
            key={locale}
            type="button"
            onClick={() => choose(locale)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-200 ${
              active ? 'bg-gold text-white' : 'text-on-dark-muted hover:text-on-dark'
            }`}
          >
            {LABELS[locale]}
          </button>
        )
      })}
    </div>
  )
}
