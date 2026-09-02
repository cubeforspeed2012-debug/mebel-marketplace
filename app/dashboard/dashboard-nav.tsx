'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Обзор' },
  { href: '/dashboard/orders', label: 'Заявки и заказы' },
  { href: '/dashboard/clients', label: 'Клиенты' },
  { href: '/dashboard/products', label: 'Моя мебель' },
  { href: '/dashboard/company', label: 'Профиль мастерской' },
  { href: '/dashboard/promotion', label: 'Продвижение' },
]

/**
 * Меню кабинета. Текущий раздел подсвечен золотой полосой слева —
 * чтобы было видно, где находишься, а не сплошной серый список.
 */
export function DashboardNav({ newOrders = 0 }: { newOrders?: number }) {
  const pathname = usePathname()

  return (
    <nav className="border border-line bg-paper p-2 lg:sticky lg:top-20">
      {NAV.map((item) => {
        const active =
          item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-between gap-2 border-l-2 px-4 py-2.5 text-sm transition-colors ${
              active
                ? 'border-gold bg-cream font-semibold text-text'
                : 'border-transparent text-text-muted hover:border-line hover:bg-cream hover:text-text'
            }`}
          >
            {item.label}

            {/* Счётчик новых заявок — самое важное в кабинете */}
            {item.href === '/dashboard/orders' && newOrders > 0 && (
              <span className="min-w-5 bg-gold px-1.5 py-0.5 text-center text-xs font-semibold text-white">
                {newOrders}
              </span>
            )}
          </Link>
        )
      })}

      <div className="mt-2 border-t border-line pt-2">
        <Link
          href="/auth/new-password"
          className="block border-l-2 border-transparent px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-line hover:bg-cream hover:text-text"
        >
          Сменить пароль
        </Link>
      </div>
    </nav>
  )
}
