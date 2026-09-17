'use client'

import { usePathname } from 'next/navigation'

/**
 * Внутри Telegram окно узкое, а сверху уже есть его собственная панель.
 * Наша шапка, подвал и предложение поставить приложение там только мешают,
 * поэтому на экране мини-приложения их не показываем.
 */
export function HideOnTg({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/tg')) return null
  return <>{children}</>
}
