'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LiquidTabs, type TabItem } from '@/components/liquid-tabs'
import { useDict } from '@/components/locale-provider'

/* Иконки одной толщины — набор должен читаться как один комплект */

function IconHome(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill={active ? 'currentColor' : 'none'}
         strokeWidth={1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3.5l9 7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function IconSearch(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" strokeWidth={active ? 2.4 : 1.8}
         stroke="currentColor" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  )
}

function IconMasters(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" strokeWidth={active ? 2.4 : 1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
      <path d="M16.5 6.2a3 3 0 0 1 0 5.6M18 19.5c0-2.3-.9-4-2.4-5" />
    </svg>
  )
}

function IconProfile(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" strokeWidth={active ? 2.4 : 1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" />
    </svg>
  )
}

const TABS: (Omit<TabItem, 'label'> & {
  key: 'home' | 'catalog' | 'masters' | 'profile'
  match: (path: string) => boolean
})[] = [
  { href: '/', key: 'home', icon: IconHome, match: (p) => p === '/' },
  {
    href: '/catalog',
    key: 'catalog',
    icon: IconSearch,
    match: (p) => p.startsWith('/catalog') || p.startsWith('/product'),
  },
  {
    href: '/companies',
    key: 'masters',
    icon: IconMasters,
    match: (p) => p.startsWith('/companies') || p.startsWith('/company'),
  },
  {
    href: '/profile',
    key: 'profile',
    icon: IconProfile,
    match: (p) =>
      p.startsWith('/profile') ||
      p.startsWith('/dashboard') ||
      p.startsWith('/account') ||
      p.startsWith('/admin') ||
      p.startsWith('/auth'),
  },
]

/**
 * Нижнее меню на телефоне: стеклянная плашка, перетекающая капсула
 * и приподнятая кнопка главного действия посередине.
 */
export function TabBar() {
  const dict = useDict()
  const pathname = usePathname()
  useSearchParams() // держим компонент в Suspense-границе вместе с навигацией

  const activeIndex = TABS.findIndex((tab) => tab.match(pathname))

  return (
    <nav
      aria-label={dict.nav.home}
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="glass relative w-full max-w-md rounded-[26px] px-2 py-1.5">
        <LiquidTabs
          items={TABS.map((tab) => ({ ...tab, label: dict.nav[tab.key] }))}
          activeIndex={activeIndex}
        />

        {/* Главное действие — приподнятая кнопка по центру */}
        <Link
          href="/dashboard/products/new"
          aria-label={dict.nav.add}
          className="press absolute -top-7 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-[20px] bg-gold text-white shadow-[0_10px_24px_rgba(138,112,83,0.45)] transition-colors duration-200 hover:bg-gold-deep"
        >
          <svg viewBox="0 0 24 24" className="size-7" fill="none" strokeWidth={2.2}
               stroke="currentColor" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
    </nav>
  )
}
