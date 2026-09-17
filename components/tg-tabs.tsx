'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/tg',
    label: 'Аналитика',
    icon: (
      <>
        <path d="M4 19.5h16" />
        <path d="M7 16v-5M12 16V7M17 16v-3" />
      </>
    ),
  },
  {
    href: '/tg/views',
    label: 'Просмотры',
    icon: (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
]

/** Нижнее меню мини-приложения: два экрана, больше внутри Telegram не нужно. */
export function TgTabs() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = pathname === tab.href

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={`press flex flex-1 flex-col items-center gap-1 pt-2.5 text-[0.6875rem] font-medium transition-colors ${
                active ? 'text-gold' : 'text-text-muted'
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-[22px]" fill="none"
                   strokeWidth={active ? 2.2 : 1.8} stroke="currentColor"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {tab.icon}
              </svg>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
