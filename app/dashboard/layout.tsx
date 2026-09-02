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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Кабинет мастера
          </div>
          <h1 className="display mt-1 text-xl">
            {company?.name ?? profile?.full_name ?? 'Новый мастер'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {profile?.role === 'admin' && <RoleSwitcher current="/dashboard" />}

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

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <DashboardNav newOrders={newOrders} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
