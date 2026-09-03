'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* Лента иконок слева — как в панелях управления: узкая, всегда на виду */

const RAIL = [
  {
    href: '/admin',
    label: 'Сводка',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v8.5h8.5" />
      </>
    ),
  },
  {
    href: '/admin?status=pending',
    label: 'На проверке',
    icon: (
      <>
        <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
        <path d="M9 8.5h6M9 12.5h6M9 16.5h3" />
      </>
    ),
  },
  {
    href: '/dashboard',
    label: 'Кабинет мастера',
    icon: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
      </>
    ),
  },
  {
    href: '/companies',
    label: 'Мастера на сайте',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 19.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
        <path d="M16.5 6.2a3 3 0 0 1 0 5.6M18 19.5c0-2.3-.9-4-2.4-5" />
      </>
    ),
  },
  {
    href: '/account',
    label: 'Мои заявки',
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="13" rx="2.5" />
        <path d="M7.5 10h9M7.5 13.5h5" />
      </>
    ),
  },
]

export function AdminRail() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Разделы управления"
      className="hidden w-[68px] shrink-0 flex-col items-center gap-2 rounded-3xl bg-[#171717] py-5 lg:flex"
    >
      <Link
        href="/"
        aria-label="На сайт"
        className="mb-4 flex size-10 items-center justify-center rounded-xl bg-gold text-sm font-bold text-white"
      >
        M
      </Link>

      {RAIL.map((item) => {
        const active = item.href === '/admin' && pathname === '/admin'

        return (
          <Link
            key={item.label}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={`press flex size-11 items-center justify-center rounded-2xl transition-colors duration-200 ${
              active
                ? 'bg-white text-[#171717]'
                : 'text-[#8f8f8f] hover:bg-white/8 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" strokeWidth={1.7}
                 stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {item.icon}
            </svg>
          </Link>
        )
      })}
    </nav>
  )
}
