'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { LiquidTabs, type TabItem } from '@/components/liquid-tabs'

const NAV: (TabItem & { match: (path: string, custom: boolean) => boolean })[] = [
  {
    href: '/catalog',
    label: 'Каталог',
    match: (p, custom) => (p.startsWith('/catalog') && !custom) || p.startsWith('/product'),
  },
  {
    href: '/catalog?type=custom_order',
    label: 'На заказ',
    match: (p, custom) => p.startsWith('/catalog') && custom,
  },
  {
    href: '/companies',
    label: 'Мастера',
    match: (p) => p.startsWith('/companies') || p.startsWith('/company'),
  },
]

/** Меню в шапке на компьютере — та же перетекающая капсула, что и на телефоне. */
export function HeaderNav() {
  const pathname = usePathname()
  const custom = useSearchParams().get('type') === 'custom_order'
  const activeIndex = NAV.findIndex((item) => item.match(pathname, custom))

  return (
    <div className="hidden md:block">
      <LiquidTabs items={NAV} activeIndex={activeIndex} variant="inline" />
    </div>
  )
}
