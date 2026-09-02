import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { getSellerContext } from '@/lib/session'

const NAV = [
  { href: '/dashboard', label: 'Обзор' },
  { href: '/dashboard/orders', label: 'Заявки и заказы' },
  { href: '/dashboard/clients', label: 'Клиенты' },
  { href: '/dashboard/products', label: 'Моя мебель' },
  { href: '/dashboard/company', label: 'Профиль мастерской' },
  { href: '/dashboard/promotion', label: 'Продвижение' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { company, profile } = await getSellerContext()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Кабинет мастера
          </div>
          <h1 className="display mt-1 text-xl">{company?.name ?? profile?.full_name ?? 'Новый мастер'}</h1>
        </div>

        <div className="flex items-center gap-3">
          {company?.status === 'pending' && (
            <span className="border border-gold px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-deep">
              На проверке
            </span>
          )}
          {company?.status === 'active' && (
            <Link
              href={`/company/${company.slug ?? company.id}`}
              className="text-sm font-semibold text-gold-deep hover:underline"
            >
              Моя страница →
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="border border-line px-4 py-2 text-sm text-text-muted transition-colors hover:border-gold hover:text-text"
            >
              Выйти
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-wrap gap-1 lg:flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border border-transparent px-3 py-2 text-sm transition-colors hover:border-line hover:bg-paper"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
