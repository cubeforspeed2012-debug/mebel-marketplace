'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Тонкая полоса вверху во время перехода между страницами.
 *
 * Страницы собираются на сервере, и после нажатия проходит доля секунды,
 * когда ничего не меняется — человеку кажется, что кнопка не сработала,
 * и он жмёт ещё раз. Полоса отвечает мгновенно и снимает это ощущение.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const search = useSearchParams()
  const [loading, setLoading] = useState(false)

  // Адрес сменился — переход закончен
  useEffect(() => {
    setLoading(false)
  }, [pathname, search])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Открытие в новой вкладке и нажатия с модификаторами нас не касаются
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const link = (event.target as HTMLElement | null)?.closest('a')
      if (!link) return

      const href = link.getAttribute('href')
      if (!href || href.startsWith('#') || link.target === '_blank') return
      if (!href.startsWith('/')) return

      // Тот же адрес — переходить некуда
      const next = new URL(href, window.location.origin)
      if (next.pathname === pathname && next.search === window.location.search) return

      setLoading(true)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])

  if (!loading) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
    >
      <div className="route-bar h-full bg-gold" />
    </div>
  )
}
