import Link from 'next/link'

const AREAS = [
  { href: '/admin', label: 'Площадка' },
  { href: '/dashboard', label: 'Кабинет мастера' },
  { href: '/account', label: 'Мои заявки' },
]

/**
 * Переключатель для администратора. Аккаунт один и умеет всё:
 * управлять площадкой, вести свою мастерскую и оставлять заявки как покупатель.
 * Показывается только администратору — остальным переключать нечего.
 */
export function RoleSwitcher({ current }: { current: '/admin' | '/dashboard' | '/account' }) {
  return (
    <div className="flex rounded-[var(--radius)] border border-line bg-paper p-1">
      {AREAS.map((area) => {
        const active = area.href === current
        return (
          <Link
            key={area.href}
            href={area.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm transition-colors duration-200 ${
              active
                ? 'bg-ink font-semibold text-on-dark'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {area.label}
          </Link>
        )
      })}
    </div>
  )
}
