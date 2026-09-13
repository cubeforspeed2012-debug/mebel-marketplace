import Link from 'next/link'
import { IconBack, IconChevron } from '@/components/ui-icons'

/**
 * Список настроек как в приложениях: пункты собраны в карточки,
 * у каждого значок слева, значение и стрелка справа. Нажал — открылся
 * отдельный экран. Ничего не прячется в выпадашках.
 */
export function SettingsGroup({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-5">
      {title && (
        <div className="mb-2 px-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
          {title}
        </div>
      )}
      <div className="divide-y divide-line overflow-hidden rounded-3xl bg-paper">{children}</div>
    </div>
  )
}

export function SettingsRow({
  href,
  icon,
  label,
  value,
  badge,
  danger = false,
}: {
  href: string
  icon: React.ReactNode
  label: string
  value?: string
  badge?: number
  danger?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-sand ${
        danger ? 'text-status-error' : 'text-text'
      }`}
    >
      <span className={danger ? 'text-status-error' : 'text-text-muted'}>{icon}</span>

      <span className="min-w-0 flex-1 truncate">{label}</span>

      {badge !== undefined && badge > 0 && (
        <span className="min-w-5 rounded-full bg-gold px-1.5 py-0.5 text-center text-xs font-semibold text-white">
          {badge}
        </span>
      )}
      {value && <span className="shrink-0 text-sm text-text-muted">{value}</span>}

      <IconChevron className="size-4 shrink-0 text-text-muted" />
    </Link>
  )
}

/** Шапка внутреннего экрана: стрелка назад и название. */
export function ScreenHeader({ title, back = '/profile' }: { title: string; back?: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Link
        href={back}
        aria-label="Назад"
        className="press flex size-10 shrink-0 items-center justify-center rounded-full bg-paper text-text transition-colors hover:bg-sand"
      >
        <IconBack />
      </Link>
      <h1 className="display truncate text-xl text-text">{title}</h1>
    </div>
  )
}
