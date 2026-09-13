import Link from 'next/link'
import { getSellerContext } from '@/lib/session'

/**
 * Кабинет мастера — четыре экрана и ничего лишнего:
 * Аналитика, Заказы, Мои работы, Профиль. Между ними переключает
 * нижнее меню — оно одинаковое и на телефоне, и на компьютере.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { company } = await getSellerContext()

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

      <div className="min-w-0">{children}</div>
    </div>
  )
}
