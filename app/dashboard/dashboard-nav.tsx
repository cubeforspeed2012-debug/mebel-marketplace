'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* Иконки одной толщины — меню должно читаться как один комплект */

const ICONS: Record<string, React.ReactNode> = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </>
  ),
  orders: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 9h8M8 13h8M8 17h4" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
      <path d="M16.5 6.2a3 3 0 0 1 0 5.6M18 19.5c0-2.3-.9-4-2.4-5" />
    </>
  ),
  products: (
    <>
      <path d="M3.5 9.5 12 4l8.5 5.5v9L12 20l-8.5-1.5v-9Z" />
      <path d="M3.5 9.5 12 13l8.5-3.5M12 13v7" />
    </>
  ),
  company: (
    <>
      <path d="M4 20.5V6.5l7-3 7 3v14" />
      <path d="M8 11h2M14 11h2M8 15h2M14 15h2M2.5 20.5h19" />
    </>
  ),
  promotion: (
    <>
      <path d="M4 14.5V9.5h3.5L14 5v14l-6.5-4.5H4Z" />
      <path d="M17.5 9a4.5 4.5 0 0 1 0 6" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" />
    </>
  ),
  password: (
    <>
      <rect x="4" y="10" width="16" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
}

const NAV = [
  { href: '/dashboard', label: 'Обзор', icon: 'overview' },
  { href: '/dashboard/orders', label: 'Заявки и заказы', icon: 'orders' },
  { href: '/dashboard/clients', label: 'Клиенты', icon: 'clients' },
  { href: '/dashboard/products', label: 'Моя мебель', icon: 'products' },
  { href: '/dashboard/company', label: 'Мастерская', icon: 'company' },
  { href: '/dashboard/promotion', label: 'Продвижение', icon: 'promotion' },
]

const BOTTOM = [
  { href: '/profile', label: 'Мой профиль', icon: 'profile' },
  { href: '/auth/new-password', label: 'Сменить пароль', icon: 'password' },
]

function Item({
  href,
  label,
  icon,
  active,
  badge,
}: {
  href: string
  label: string
  icon: string
  active: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`press flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-colors duration-200 ${
        active
          ? 'bg-white font-semibold text-[#171717]'
          : 'text-text-muted hover:bg-sand hover:text-text'
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" strokeWidth={1.7}
           stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {ICONS[icon]}
      </svg>

      <span className="min-w-0 flex-1 truncate">{label}</span>

      {badge && badge > 0 ? (
        <span
          className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold ${
            active ? 'bg-[#171717] text-white' : 'bg-gold text-white'
          }`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  )
}

/**
 * Меню кабинета. Текущий раздел — светлой плашкой, как в панели управления:
 * место, где ты находишься, должно быть видно сразу, без вглядывания.
 */
export function DashboardNav({ newOrders = 0 }: { newOrders?: number }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="rounded-3xl bg-paper p-2 lg:sticky lg:top-20">
      <div className="space-y-1">
        {NAV.map((item) => (
          <Item
            key={item.href}
            {...item}
            active={isActive(item.href)}
            badge={item.href === '/dashboard/orders' ? newOrders : undefined}
          />
        ))}
      </div>

      <div className="mt-2 space-y-1 border-t border-line pt-2">
        {BOTTOM.map((item) => (
          <Item key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
  )
}
