import Link from 'next/link'
import { formatPrice } from '@/lib/constants'
import { getSellerContext } from '@/lib/session'
import { BoostForm } from './boost-form'

export const metadata = { title: 'Продвижение' }

const PROMOTION_STATUS: Record<string, string> = {
  pending: 'Ждёт оплаты',
  paid: 'Оплачено',
  active: 'Действует',
  expired: 'Завершено',
  cancelled: 'Отменено',
}

export default async function PromotionPage() {
  const { supabase, company } = await getSellerContext()

  if (!company) {
    return (
      <div>
        <h2 className="display gold-rule text-xl">Продвижение</h2>
        <div className="mt-7 rounded-[var(--radius)] border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-text-muted">Сначала создайте профиль мастерской.</p>
          <Link
            href="/dashboard/company"
            className="mt-5 inline-block bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
          >
            Заполнить профиль
          </Link>
        </div>
      </div>
    )
  }

  const [productsResult, promotionsResult] = await Promise.all([
    supabase
      .from('products')
      .select('id, title')
      .eq('company_id', company.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('promotions')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const promotions = promotionsResult.data ?? []

  return (
    <div className="space-y-8">
      <div>
        <h2 className="display gold-rule text-xl">Продвижение</h2>
        <p className="mt-5 max-w-2xl leading-relaxed text-text-muted">
          Поднимает вашу мебель выше других в каталоге и в поиске по площадке.
          Чем выше — тем больше звонков.
        </p>
      </div>

      <BoostForm products={productsResult.data ?? []} />

      <div className="border border-line bg-cream p-5 text-sm leading-relaxed">
        <strong className="font-semibold">Как оплатить.</strong> Оплата через Payme и Click
        подключается — пока после заказа продвижения с вами свяжется администратор
        площадки и подтвердит оплату вручную.
      </div>

      {promotions.length > 0 && (
        <div>
          <h3 className="display gold-rule text-lg">История продвижения</h3>
          <div className="mt-6 overflow-x-auto rounded-[var(--radius)] border border-line bg-paper">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-line text-xs font-semibold uppercase tracking-widest text-text-muted">
                <tr>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Срок</th>
                  <th className="px-4 py-3">Сумма</th>
                  <th className="px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => (
                  <tr key={promo.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      {new Date(promo.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{promo.hours} ч</td>
                    <td className="px-4 py-3">{formatPrice(promo.amount)}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {PROMOTION_STATUS[promo.status] ?? promo.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
