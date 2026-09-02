'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

/* Иконки нарисованы вручную: одна линия, один вес — так набор выглядит цельным */

function IconCatalog({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" strokeWidth={active ? 2.2 : 1.7}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="4" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="14.5" width="7.5" height="5.5" rx="1.5" />
      <rect x="13.5" y="14.5" width="7.5" height="5.5" rx="1.5" />
    </svg>
  )
}

function IconCustom({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" strokeWidth={active ? 2.2 : 1.7}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 20h18" />
      <path d="M5 20V9.5l7-5.5 7 5.5V20" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  )
}

function IconMasters({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" strokeWidth={active ? 2.2 : 1.7}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
      <path d="M16.5 6.2a3 3 0 0 1 0 5.6M18 19.5c0-2.3-.9-4-2.4-5" />
    </svg>
  )
}

function IconAccount({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" strokeWidth={active ? 2.2 : 1.7}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" />
    </svg>
  )
}

const TABS = [
  { href: '/catalog', label: 'Каталог', Icon: IconCatalog },
  { href: '/catalog?type=custom_order', label: 'На заказ', Icon: IconCustom },
  { href: '/companies', label: 'Мастера', Icon: IconMasters },
  { href: '/dashboard', label: 'Кабинет', Icon: IconAccount },
]

/**
 * Нижнее меню на телефоне — стеклянная плашка поверх контента.
 * Подсветка не перерисовывается, а переезжает: так переход читается
 * как движение, а не как мигание.
 */
export function TabBar() {
  const pathname = usePathname()
  const params = useSearchParams()
  const isCustom = params.get('type') === 'custom_order'

  const activeIndex = (() => {
    if (pathname.startsWith('/companies')) return 2
    if (pathname.startsWith('/catalog')) return isCustom ? 1 : 0
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/account') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/auth')
    ) {
      return 3
    }
    return -1
  })()

  return (
    <nav
      aria-label="Основное меню"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="glass relative flex w-full max-w-md rounded-full p-1.5">
        {/* Подсветка активного раздела — едет под пальцем */}
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-1.5 rounded-full bg-ink transition-transform duration-[420ms]"
          style={{
            width: `calc((100% - 0.75rem) / ${TABS.length})`,
            transform: `translateX(${activeIndex < 0 ? 0 : activeIndex * 100}%)`,
            opacity: activeIndex < 0 ? 0 : 1,
            transitionTimingFunction: 'var(--ease-ios)',
          }}
        />

        {TABS.map((tab, index) => {
          const active = index === activeIndex
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`press relative z-10 flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[0.6875rem] font-medium transition-colors duration-300 ${
                active ? 'text-on-dark' : 'text-text-muted'
              }`}
            >
              <tab.Icon active={active} />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
