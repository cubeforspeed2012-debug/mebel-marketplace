import Link from 'next/link'
import { getSellerContext } from '@/lib/session'
import { CabinetTabs } from './cabinet-tabs'

/**
 * Кабинет мастера — четыре экрана и ничего лишнего:
 * Аналитика, Заказы, Мои работы, Профиль. На телефоне между ними
 * переключает нижнее меню, на компьютере — та же полоса сверху.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, company } = await getSellerContext()

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
    <div className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display truncate text-xl text-text">{company?.name ?? 'Моя мастерская'}</h1>
          {company?.status === 'pending' && (
            <div className="mt-1 text-sm text-status-process">На проверке — скоро появится в каталоге</div>
          )}
          {company?.status === 'blocked' && (
            <div className="mt-1 text-sm text-status-error">Скрыта из каталога</div>
          )}
          {company?.status === 'active' && (
            <Link
              href={`/company/${company.slug ?? company.id}`}
              className="mt-1 inline-block text-sm text-gold hover:underline"
            >
              Посмотреть мою страницу →
            </Link>
          )}
        </div>
      </div>

      {/* На компьютере нижнего меню нет — те же четыре кнопки сверху */}
      <div className="mb-6 hidden md:block">
        <CabinetTabs newOrders={newOrders} />
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  )
}
