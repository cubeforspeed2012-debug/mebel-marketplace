'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard', label: 'Аналитика', match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/clients') || p.startsWith('/dashboard/promotion') },
  { href: '/dashboard/orders', label: 'Заказы', match: (p: string) => p.startsWith('/dashboard/orders') },
  { href: '/dashboard/products', label: 'Мои работы', match: (p: string) => p.startsWith('/dashboard/products') },
  { href: '/profile', label: 'Профиль', match: (p: string) => p.startsWith('/profile') },
]

/** Четыре кнопки кабинета — те же, что в нижнем меню телефона. */
export function CabinetTabs({ newOrders = 0 }: { newOrders?: number }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 rounded-full bg-paper p-1">
      {TABS.map((tab) => {
        const active = tab.match(pathname)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`press flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm transition-colors duration-200 ${
              active ? 'bg-gold font-semibold text-white' : 'text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
            {tab.href === '/dashboard/orders' && newOrders > 0 && (
              <span
                className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold ${
                  active ? 'bg-white text-gold' : 'bg-gold text-white'
                }`}
              >
                {newOrders}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
