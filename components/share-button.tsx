'use client'

import { useState } from 'react'
import { useDict } from '@/components/locale-provider'

/**
 * Кнопка «Поделиться». Мастер сам рассылает свою страницу клиентам —
 * на телефоне открывается системное меню, на компьютере копируется ссылка.
 */
export function ShareButton({ title }: { title: string }) {
  const dict = useDict()
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // Человек передумал делиться — это не ошибка, просто выходим
        return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="press inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-text-muted transition-colors hover:border-gold hover:text-text"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8}
           strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v13" />
        <path d="m8 7 4-4 4 4" />
        <path d="M5 13v6.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V13" />
      </svg>
      {copied ? dict.common.shareCopied : dict.common.share}
    </button>
  )
}
