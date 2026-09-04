'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

/* Разделы управления. Один список — и для ленты слева, и для полосы на телефоне. */

const SECTIONS = [
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
    href: '/admin/approvals',
    label: 'Одобрение',
    icon: (
      <>
        <path d="M4 12.5 9.5 18 20 6.5" />
      </>
    ),
  },
  {
    href: '/admin/users',
    label: 'Аккаунты',
    icon: (
      <>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 19.5c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6" />
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
    href: '/profile',
    label: 'Мой профиль',
    icon: (
      <>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.5 20c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" />
      </>
    ),
  },
]

function useActiveSection() {
  const pathname = usePathname()
  const search = useSearchParams()

  return (href: string) => {
    if (href === '/admin') return pathname === '/admin' && search.get('status') !== 'pending'
    return pathname === href || pathname.startsWith(`${href}/`)
  }
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" strokeWidth={1.7}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}

/** Узкая лента слева — на компьютере она всегда на виду. */
export function AdminRail({ pending = 0 }: { pending?: number }) {
  const isActive = useActiveSection()

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

      {SECTIONS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          title={item.label}
          aria-label={item.label}
          className={`press relative flex size-11 items-center justify-center rounded-2xl transition-colors duration-200 ${
            isActive(item.href)
              ? 'bg-white text-[#171717]'
              : 'text-[#8f8f8f] hover:bg-white/8 hover:text-white'
          }`}
        >
          <Icon>{item.icon}</Icon>

          {item.href === '/admin/approvals' && pending > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[0.625rem] font-semibold text-white">
              {pending}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

/** Полоса разделов на телефоне: листается пальцем, ничего не прячется в меню. */
export function AdminMobileNav({ pending = 0 }: { pending?: number }) {
  const isActive = useActiveSection()

  return (
    <nav
      aria-label="Разделы управления"
      className="-mx-1 mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {SECTIONS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`press flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-colors duration-200 ${
            isActive(item.href)
              ? 'bg-white font-semibold text-[#171717]'
              : 'bg-[#232323] text-[#a8a8a8]'
          }`}
        >
          <Icon>{item.icon}</Icon>
          {item.label}

          {item.href === '/admin/approvals' && pending > 0 && (
            <span className="min-w-5 rounded-full bg-gold px-1.5 text-center text-xs font-semibold text-white">
              {pending}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
