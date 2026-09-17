'use client'

import { usePathname } from 'next/navigation'
import { LiquidTabs } from '@/components/liquid-tabs'

function IconChart(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[21px]" fill="none" strokeWidth={active ? 2.4 : 1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5h16" />
      <path d="M7 16v-5M12 16V7M17 16v-3" />
    </svg>
  )
}

function IconEye(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[21px]" fill="none" strokeWidth={active ? 2.4 : 1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

const TABS = [
  { href: '/tg', label: 'Аналитика', icon: IconChart },
  { href: '/tg/views', label: 'Просмотры', icon: IconEye },
]

/**
 * Нижнее меню мини-приложения. Стеклянная плашка и перетекающая капсула —
 * та же, что на сайте, чтобы приложение и сайт ощущались одним целым.
 */
export function TgTabs() {
  const pathname = usePathname()
  const activeIndex = TABS.findIndex((tab) => tab.href === pathname)

  return (
    <nav
      aria-label="Разделы кабинета"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass w-full max-w-xs rounded-[26px] px-2 py-1.5">
        <LiquidTabs items={TABS} activeIndex={activeIndex} />
      </div>
    </nav>
  )
}
