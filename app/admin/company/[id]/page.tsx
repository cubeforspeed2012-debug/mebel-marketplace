import Link from 'next/link'
import { notFound } from 'next/navigation'
import { setCompanyStatus } from '@/app/admin/actions'
import { formatPhone, formatPrice, telHref, WORK_TYPES } from '@/lib/constants'
import { ORDER_STATUSES } from '@/lib/orders'
import { requireAdmin } from '@/lib/session'

export const metadata = { title: 'Мастерская' }

type Detail = {
  company_id: number
  name: string
  slug: string | null
  status: string
  district: string | null
  address: string | null
  work_type: keyof typeof WORK_TYPES | null
  phone_public: string | null
  instagram: string | null
  telegram: string | null
  description: string | null
  logo_url: string | null
  moderation_note: string | null
  created_at: string
  views_count: number
  owner_email: string | null
  products_total: number
  products_active: number
  clients_count: number
  orders_total: number
  orders_new: number
  orders_contacted: number
  orders_measure: number
  orders_progress: number
  orders_done: number
  orders_cancelled: number
  revenue_done: number
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-line bg-paper p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="display mt-2 text-2xl">{value}</div>
    </div>
  )
}

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  const { supabase } = await requireAdmin()
  const { data } = await supabase.rpc('admin_company_detail', { p_id: Number(id) })
  const company = (data?.[0] ?? null) as Detail | null

  if (!company) notFound()

  const funnel = [
    ['new', company.orders_new],
    ['contacted', company.orders_contacted],
    ['measurement', company.orders_measure],
    ['in_progress', company.orders_progress],
    ['done', company.orders_done],
    ['cancelled', company.orders_cancelled],
  ] as const

  return (
    <div className="space-y-10">
      <Link href="/admin" className="inline-block text-sm text-gold-deep hover:underline">
        ← Все мастерские
      </Link>

      {/* Кто это */}
      <section className="flex flex-wrap items-start gap-5 border border-line bg-paper p-6">
        <div className="size-20 shrink-0 overflow-hidden bg-cream">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="display flex h-full items-center justify-center text-2xl text-gold-deep">
              {company.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="display text-xl">{company.name}</h2>
          <div className="mt-2 text-sm text-text-muted">
            {company.work_type && WORK_TYPES[company.work_type]}
            {company.district && ` · ${company.district} район`}
            {' · на площадке с '}
            {new Date(company.created_at).toLocaleDateString('ru-RU')}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {company.phone_public && (
              <a href={telHref(company.phone_public)} className="text-gold-deep hover:underline">
                {formatPhone(company.phone_public)}
              </a>
            )}
            {company.owner_email && (
              <span className="text-text-muted">{company.owner_email}</span>
            )}
            {company.instagram && (
              <a
                href={`https://instagram.com/${company.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-deep hover:underline"
              >
                Instagram
              </a>
            )}
          </div>

          {company.description && (
            <p className="mt-4 max-w-2xl leading-relaxed text-text-muted">
              {company.description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          <span
            className={`px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
              company.status === 'active'
                ? 'bg-gold text-ink'
                : company.status === 'blocked'
                  ? 'bg-neutral-300 text-neutral-700'
                  : 'border border-gold text-gold-deep'
            }`}
          >
            {company.status === 'active'
              ? 'В каталоге'
              : company.status === 'blocked'
                ? 'Заблокирована'
                : 'На проверке'}
          </span>

          {company.status === 'active' && (
            <Link
              href={`/company/${company.slug ?? company.company_id}`}
              className="text-sm text-gold-deep hover:underline"
            >
              Открыть страницу →
            </Link>
          )}
        </div>
      </section>

      {/* Цифры */}
      <section>
        <h3 className="display gold-rule mb-6 text-lg">Показатели</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Просмотры страницы" value={company.views_count} />
          <Metric label="Клиентов" value={company.clients_count} />
          <Metric label="Заявок всего" value={company.orders_total} />
          <Metric
            label="Мебель в каталоге"
            value={`${company.products_active} / ${company.products_total}`}
          />
        </div>

        <p className="mt-3 text-xs text-text-muted">
          Контакты клиентов мастера площадке не видны — это его база. Здесь только счёт.
        </p>
      </section>

      {/* Воронка */}
      <section>
        <h3 className="display gold-rule mb-6 text-lg">Как идут заявки</h3>

        {company.orders_total === 0 ? (
          <p className="border border-dashed border-line bg-paper p-8 text-center text-text-muted">
            Заявок пока не было.
          </p>
        ) : (
          <div className="space-y-3 border border-line bg-paper p-6">
            {funnel.map(([status, count]) => {
              const share = company.orders_total
                ? Math.round((count / company.orders_total) * 100)
                : 0

              return (
                <div key={status} className="flex items-center gap-4">
                  <span className="w-32 shrink-0 text-sm text-text-muted">
                    {ORDER_STATUSES[status]}
                  </span>
                  <span className="h-2 flex-1 bg-cream">
                    <span
                      className="block h-full bg-gold"
                      style={{ width: `${share}%` }}
                      aria-hidden
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold">{count}</span>
                </div>
              )
            })}

            {company.revenue_done > 0 && (
              <div className="mt-5 border-t border-line pt-4 text-sm">
                Сумма завершённых заказов:{' '}
                <strong className="text-gold-deep">{formatPrice(company.revenue_done)}</strong>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Решения по мастерской */}
      <section>
        <h3 className="display gold-rule mb-6 text-lg">Действия</h3>

        {company.moderation_note && (
          <p className="mb-4 border border-line bg-cream px-4 py-3 text-sm">
            Заметка модератора: {company.moderation_note}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {company.status !== 'active' && (
            <form action={setCompanyStatus}>
              <input type="hidden" name="id" value={company.company_id} />
              <input type="hidden" name="status" value="active" />
              <button
                type="submit"
                className="bg-gold px-6 py-2.5 font-semibold text-ink transition-colors hover:bg-ink hover:text-gold"
              >
                Одобрить и показать в каталоге
              </button>
            </form>
          )}

          {company.status === 'active' && (
            <form action={setCompanyStatus} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={company.company_id} />
              <input type="hidden" name="status" value="blocked" />
              <input
                name="note"
                placeholder="Причина блокировки"
                className="border border-line px-4 py-2.5 text-sm outline-none focus:border-gold"
              />
              <button
                type="submit"
                className="border border-line px-6 py-2.5 text-sm text-text-muted transition-colors hover:border-red-400 hover:text-red-700"
              >
                Заблокировать
              </button>
            </form>
          )}

          {company.status === 'blocked' && (
            <form action={setCompanyStatus}>
              <input type="hidden" name="id" value={company.company_id} />
              <input type="hidden" name="status" value="pending" />
              <button
                type="submit"
                className="border border-line px-6 py-2.5 text-sm transition-colors hover:border-gold"
              >
                Снять блокировку — вернуть на проверку
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
