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

function IconWorks(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" strokeWidth={active ? 2.4 : 1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 9.5 12 4l8.5 5.5v9L12 20l-8.5-1.5v-9Z" />
      <path d="M3.5 9.5 12 13l8.5-3.5M12 13v7" />
    </svg>
  )
}

function IconPanel(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" strokeWidth={active ? 2.4 : 1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v8.5h8.5" />
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

type TabKey =
  | 'home'
  | 'catalog'
  | 'masters'
  | 'profile'
  | 'overview'
  | 'orders'
  | 'portfolio'
  | 'approvals'
  | 'accounts'
  | 'favorites'

type Tab = Omit<TabItem, 'label'> & { key: TabKey; match: (path: string) => boolean }

function IconHeart(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill={active ? 'currentColor' : 'none'}
         strokeWidth={1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20s-7.5-4.7-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3C19.5 15.3 12 20 12 20Z" />
    </svg>
  )
}

function IconChart(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" strokeWidth={active ? 2.4 : 1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5h16" />
      <path d="M7 16v-5M12 16V7M17 16v-3" />
    </svg>
  )
}

function IconOrders(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" strokeWidth={active ? 2.4 : 1.8}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 9h8M8 13h8M8 17h4" />
    </svg>
  )
}

function IconCheck(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" strokeWidth={active ? 2.6 : 2}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  )
}

const HOME: Tab = { href: '/', key: 'home', icon: IconHome, match: (p) => p === '/' }
const CATALOG: Tab = {
  href: '/catalog',
  key: 'catalog',
  icon: IconSearch,
  match: (p) => p.startsWith('/catalog') || p.startsWith('/product'),
}
const MASTERS: Tab = {
  href: '/companies',
  key: 'masters',
  icon: IconMasters,
  match: (p) => p.startsWith('/companies') || p.startsWith('/company'),
}
const FAVORITES: Tab = {
  href: '/favorites',
  key: 'favorites',
  icon: IconHeart,
  match: (p) => p.startsWith('/favorites'),
}
const PROFILE: Tab = {
  href: '/profile',
  key: 'profile',
  icon: IconProfile,
  match: (p) => p.startsWith('/profile') || p.startsWith('/account') || p.startsWith('/auth'),
}

/*
 * У каждого своё меню, и в нём только то, чем он пользуется каждый день.
 * Гость и покупатель смотрят и ищут. Мастер работает: заказы, портфолио,
 * цифры. Администратор разбирает очередь и следит за площадкой.
 */
const SETS: Record<'guest' | 'buyer' | 'seller' | 'admin', Tab[]> = {
  guest: [HOME, CATALOG, FAVORITES, PROFILE],
  buyer: [HOME, CATALOG, FAVORITES, PROFILE],
  seller: [
    // Мастеру каталог нужен не меньше: посмотреть чужие работы и цены
    CATALOG,
    { href: '/dashboard/orders', key: 'orders', icon: IconOrders, match: (p) => p.startsWith('/dashboard/orders') },
    { href: '/dashboard/products', key: 'portfolio', icon: IconWorks, match: (p) => p.startsWith('/dashboard/products') },
    {
      ...PROFILE,
      match: (p) =>
        p.startsWith('/profile') ||
        p.startsWith('/account') ||
        p.startsWith('/auth') ||
        p === '/dashboard' ||
        p.startsWith('/dashboard/clients') ||
        p.startsWith('/dashboard/promotion'),
    },
  ],
  admin: [
    { href: '/admin', key: 'overview', icon: IconPanel, match: (p) => p === '/admin' || p.startsWith('/admin/company') },
    { href: '/admin/approvals', key: 'approvals', icon: IconCheck, match: (p) => p.startsWith('/admin/approvals') },
    { href: '/admin/users', key: 'accounts', icon: IconMasters, match: (p) => p.startsWith('/admin/users') },
    { ...PROFILE, match: (p) => p.startsWith('/profile') || p.startsWith('/account') || p.startsWith('/dashboard') },
  ],
}

/**
 * Нижнее меню на телефоне: стеклянная плашка, перетекающая капсула
 * и приподнятая кнопка главного действия посередине.
 */
export function TabBar({ role = 'guest' }: { role?: 'guest' | 'buyer' | 'seller' | 'admin' }) {
  const dict = useDict()
  const pathname = usePathname()
  useSearchParams() // держим компонент в Suspense-границе вместе с навигацией

  const tabs = SETS[role]
  const activeIndex = tabs.findIndex((tab) => tab.match(pathname))

  // Кнопка «+» — только тем, кому есть что добавлять: работу в портфолио
  const canAdd = role === 'seller' || role === 'admin'

  return (
    <nav
      aria-label={dict.nav.home}
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="glass relative w-full max-w-md rounded-[26px] px-2 py-1.5">
        <LiquidTabs
          items={tabs.map((tab) => ({ ...tab, label: dict.nav[tab.key] }))}
          activeIndex={activeIndex}
        />

        {/* Главное действие — приподнятая кнопка по центру */}
        {canAdd && (
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
        )}
      </div>
    </nav>
  )
}
