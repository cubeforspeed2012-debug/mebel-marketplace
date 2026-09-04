'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { LiquidTabs, type TabItem } from '@/components/liquid-tabs'
import { useDict } from '@/components/locale-provider'

const NAV: (Omit<TabItem, 'label'> & {
  key: 'catalog' | 'custom' | 'masters'
  match: (path: string, custom: boolean) => boolean
})[] = [
  {
    href: '/catalog',
    key: 'catalog',
    match: (p, custom) => (p.startsWith('/catalog') && !custom) || p.startsWith('/product'),
  },
  {
    href: '/catalog?type=custom_order',
    key: 'custom',
    match: (p, custom) => p.startsWith('/catalog') && custom,
  },
  {
    href: '/companies',
    key: 'masters',
    match: (p) => p.startsWith('/companies') || p.startsWith('/company'),
  },
]

/** Меню в шапке на компьютере — та же перетекающая капсула, что и на телефоне. */
export function HeaderNav() {
  const dict = useDict()
  const pathname = usePathname()
  const custom = useSearchParams().get('type') === 'custom_order'
  const activeIndex = NAV.findIndex((item) => item.match(pathname, custom))

  return (
    <div className="hidden md:block">
      <LiquidTabs
        items={NAV.map((item) => ({ ...item, label: dict.nav[item.key] }))}
        activeIndex={activeIndex}
        variant="inline"
      />
    </div>
  )
}
