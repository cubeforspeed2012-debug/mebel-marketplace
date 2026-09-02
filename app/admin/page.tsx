import Link from 'next/link'
import { formatPhone, formatPrice, WORK_TYPES } from '@/lib/constants'
import { requireAdmin } from '@/lib/session'
import { confirmPromotion } from './actions'

export const metadata = { title: 'Управление площадкой' }

const STATUS_LABEL: Record<string, string> = {
  pending: 'На проверке',
  active: 'В каталоге',
  blocked: 'Заблокирована',
}

type CompanyStats = {
  company_id: number
  name: string
  slug: string | null
  status: string
  district: string | null
  work_type: keyof typeof WORK_TYPES | null
  phone_public: string | null
  created_at: string
  views_count: number
  products_count: number
  clients_count: number
  orders_count: number
  new_orders: number
  done_orders: number
}

type Overview = {
  companies_total: number
  companies_pending: number
  companies_active: number
  products_total: number
  orders_total: number
  orders_new: number
  clients_total: number
  users_total: number
  views_today: number
  views_week: number
  views_total: number
}

function Metric({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-line bg-paper p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="display mt-2 text-3xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-text-muted">{hint}</div>}
    </div>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filter } = await searchParams
  const { supabase } = await requireAdmin()

  const [overviewResult, companiesResult, promotionsResult] = await Promise.all([
    supabase.rpc('admin_overview'),
    supabase.rpc('admin_company_stats'),
    supabase
      .from('promotions')
      .select('*, companies (id, name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const overview = (overviewResult.data?.[0] ?? null) as Overview | null
  const allCompanies = (companiesResult.data ?? []) as CompanyStats[]
  const companies = filter ? allCompanies.filter((c) => c.status === filter) : allCompanies
  const promotions = promotionsResult.data ?? []

  return (
    <div className="space-y-10">
      {/* Сводка площадки */}
      <section>
        <h2 className="display gold-rule mb-6 text-lg">Площадка сегодня</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Просмотров сегодня"
            value={overview?.views_today ?? 0}
            hint={`За неделю: ${overview?.views_week ?? 0} · Всего: ${overview?.views_total ?? 0}`}
          />
          <Metric
            label="Мастерских"
            value={overview?.companies_active ?? 0}
            hint={`На проверке: ${overview?.companies_pending ?? 0} · Всего: ${overview?.companies_total ?? 0}`}
          />
          <Metric
            label="Заявок"
            value={overview?.orders_total ?? 0}
            hint={`Новых: ${overview?.orders_new ?? 0}`}
          />
          <Metric
            label="Мебели в каталоге"
            value={overview?.products_total ?? 0}
            hint={`Клиентов у мастеров: ${overview?.clients_total ?? 0}`}
          />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          Просмотры считаются при каждом открытии страницы мастера или товара —
          это не уникальные люди, а обращения к площадке.
        </p>
      </section>

      {/* Ждут подтверждения оплаты */}
      {promotions.length > 0 && (
        <section>
          <h2 className="display gold-rule mb-6 text-lg">Продвижение ждёт оплаты</h2>
          <div className="space-y-3">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="flex flex-wrap items-center gap-4 border border-gold bg-gold/10 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {(promo.companies as { name?: string } | null)?.name ?? 'Мастерская'}
                  </div>
                  <div className="text-sm text-text-muted">
                    {promo.hours} ч · {formatPrice(promo.amount)} ·{' '}
                    {new Date(promo.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <form action={confirmPromotion}>
                  <input type="hidden" name="id" value={promo.id} />
                  <button
                    type="submit"
                    className="bg-gold px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-deep"
                  >
                    Оплата получена — запустить
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Мастерские */}
      <section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="display gold-rule text-lg">Мастерские</h2>
          {(overview?.companies_pending ?? 0) > 0 && (
            <span className="bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ink">
              На проверке: {overview?.companies_pending}
            </span>
          )}
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <Link
            href="/admin"
            className={`border px-4 py-2 text-sm transition-colors ${
              !filter
                ? 'border-gold bg-gold font-semibold text-white'
                : 'border-line bg-paper text-text-muted hover:border-gold'
            }`}
          >
            Все
          </Link>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <Link
              key={value}
              href={`/admin?status=${value}`}
              className={`border px-4 py-2 text-sm transition-colors ${
                filter === value
                  ? 'border-gold bg-gold font-semibold text-white'
                  : 'border-line bg-paper text-text-muted hover:border-gold'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {companies.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-line bg-paper p-12 text-center text-text-muted">
            Мастерских пока нет.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-paper">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs font-semibold uppercase tracking-widest text-text-muted">
                <tr>
                  <th className="px-4 py-3">Мастерская</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Просмотры</th>
                  <th className="px-4 py-3 text-right">Мебель</th>
                  <th className="px-4 py-3 text-right">Клиенты</th>
                  <th className="px-4 py-3 text-right">Заявки</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.company_id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/company/${company.company_id}`}
                        className="font-semibold hover:text-gold-deep"
                      >
                        {company.name}
                      </Link>
                      <div className="text-xs text-text-muted">
                        {company.work_type && WORK_TYPES[company.work_type]}
                        {company.district && ` · ${company.district}`}
                        {company.phone_public && ` · ${formatPhone(company.phone_public)}`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-widest ${
                          company.status === 'active'
                            ? 'bg-gold text-white'
                            : company.status === 'blocked'
                              ? 'bg-neutral-300 text-neutral-700'
                              : 'border border-gold text-gold-deep'
                        }`}
                      >
                        {STATUS_LABEL[company.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{company.views_count}</td>
                    <td className="px-4 py-3 text-right">{company.products_count}</td>
                    <td className="px-4 py-3 text-right">{company.clients_count}</td>
                    <td className="px-4 py-3 text-right">
                      {company.orders_count}
                      {company.new_orders > 0 && (
                        <span className="ml-1.5 bg-gold px-1.5 text-xs font-semibold text-white">
                          {company.new_orders}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/company/${company.company_id}`}
                        className="border border-line px-4 py-2 text-xs transition-colors hover:border-gold"
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
