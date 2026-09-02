'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

/* Иконки одной толщины — набор должен читаться как один комплект */

function IconHome({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill={active ? 'currentColor' : 'none'}
         strokeWidth={1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3.5l9 7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function IconSearch({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none"
         strokeWidth={active ? 2.4 : 1.8} stroke="currentColor" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" strokeWidth={2.2}
         stroke="currentColor" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconMasters({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none"
         strokeWidth={active ? 2.4 : 1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
      <path d="M16.5 6.2a3 3 0 0 1 0 5.6M18 19.5c0-2.3-.9-4-2.4-5" />
    </svg>
  )
}

function IconProfile({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none"
         strokeWidth={active ? 2.4 : 1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" />
    </svg>
  )
}

const LEFT = [
  { href: '/', label: 'Главная', Icon: IconHome, match: (p: string) => p === '/' },
  {
    href: '/catalog',
    label: 'Каталог',
    Icon: IconSearch,
    match: (p: string) => p.startsWith('/catalog') || p.startsWith('/product'),
  },
]

const RIGHT = [
  {
    href: '/companies',
    label: 'Мастера',
    Icon: IconMasters,
    match: (p: string) => p.startsWith('/companies') || p.startsWith('/company'),
  },
  {
    href: '/dashboard',
    label: 'Профиль',
    Icon: IconProfile,
    match: (p: string) =>
      p.startsWith('/dashboard') ||
      p.startsWith('/account') ||
      p.startsWith('/admin') ||
      p.startsWith('/auth'),
  },
]

/**
 * Нижнее меню на телефоне — стеклянная плашка с приподнятой кнопкой
 * посередине. Центр отдан главному действию: разместить мебель.
 */
export function TabBar() {
  const pathname = usePathname()
  const params = useSearchParams()
  const isCustom = params.get('type') === 'custom_order'

  function Item({
    href,
    label,
    Icon,
    active,
  }: {
    href: string
    label: string
    Icon: ({ active }: { active: boolean }) => React.JSX.Element
    active: boolean
  }) {
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`press flex flex-1 flex-col items-center gap-1 py-2 text-[0.625rem] font-medium transition-colors duration-300 ${
          active ? 'text-gold' : 'text-text-muted'
        }`}
      >
        <Icon active={active} />
        {label}
      </Link>
    )
  }

  return (
    <nav
      aria-label="Основное меню"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="glass relative flex w-full max-w-md items-center rounded-[26px] px-2 pb-1 pt-1.5">
        {LEFT.map((item) => (
          <Item
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.Icon}
            active={item.match(pathname) && !(item.href === '/catalog' && isCustom)}
          />
        ))}

        {/* Приподнятая кнопка в центре — как на макете */}
        <div className="relative flex w-16 shrink-0 justify-center">
          <Link
            href="/dashboard/products/new"
            aria-label="Разместить мебель"
            className="press absolute -top-7 flex size-14 items-center justify-center rounded-[20px] bg-gold text-white shadow-[0_10px_24px_rgba(131,115,98,0.45)] transition-colors duration-200 hover:bg-gold-deep"
          >
            <IconPlus />
          </Link>
        </div>

        {RIGHT.map((item) => (
          <Item
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.Icon}
            active={item.match(pathname)}
          />
        ))}
      </div>
    </nav>
  )
}
