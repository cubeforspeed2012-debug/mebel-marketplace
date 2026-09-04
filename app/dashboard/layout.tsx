import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { RoleSwitcher } from '@/components/role-switcher'
import { getSellerContext } from '@/lib/session'
import { DashboardNav } from './dashboard-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, company, profile } = await getSellerContext()

  // Счётчик новых заявок — показываем прямо в меню, чтобы не пропустить клиента.
  let newOrders = 0
  if (company) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('status', 'new')
    newOrders = count ?? 0
  }

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Верхняя строка кабинета */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-text-muted">Сегодня, {today}</div>
          <h1 className="display mt-1 truncate text-xl text-text">
            {company?.name ?? profile?.full_name ?? 'Новый мастер'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {profile?.role === 'admin' && <RoleSwitcher current="/dashboard" />}

          {company?.status === 'pending' && (
            <span className="rounded-full bg-status-process/20 px-4 py-2 text-xs font-medium text-status-process">
              На проверке
            </span>
          )}
          {company?.status === 'blocked' && (
            <span className="rounded-full bg-status-error/20 px-4 py-2 text-xs font-medium text-status-error">
              Заблокирована
            </span>
          )}
          {company?.status === 'active' && (
            <Link
              href={`/company/${company.slug ?? company.id}`}
              className="press rounded-full bg-sand px-4 py-2 text-sm text-text transition-colors hover:bg-gold hover:text-white"
            >
              Моя страница →
            </Link>
          )}

          <form action={signOut}>
            <button
              type="submit"
              className="press rounded-full bg-sand px-4 py-2 text-sm text-text-muted transition-colors hover:bg-paper hover:text-text"
            >
              Выйти
            </button>
          </form>

          <span className="flex size-10 items-center justify-center rounded-full bg-gold text-sm font-semibold text-white">
            {(company?.name ?? profile?.full_name ?? 'М').charAt(0)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[248px_1fr]">
        <DashboardNav newOrders={newOrders} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
