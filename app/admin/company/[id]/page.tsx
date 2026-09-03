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
    <div className="rounded-3xl bg-[#1f1f1f] p-5">
      <div className="text-sm text-[#8f8f8f]">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="text-sm text-[#8f8f8f] hover:text-white">
          ← Все мастерские
        </Link>
        <Link
          href="/admin/users"
          className="press rounded-full bg-[#2a2a2a] px-4 py-2 text-xs text-[#d6d6d6] transition-colors hover:bg-white hover:text-[#171717]"
        >
          Аккаунт владельца
        </Link>
      </div>

      {/* Кто это */}
      <section className="flex flex-wrap items-start gap-5 rounded-3xl bg-[#1f1f1f] p-6">
        <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-[#2a2a2a]">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl font-semibold text-gold">
              {company.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-white">{company.name}</h2>
          <div className="mt-2 text-sm text-[#8f8f8f]">
            {company.work_type && WORK_TYPES[company.work_type]}
            {company.district && ` · ${company.district} район`}
            {' · на площадке с '}
            {new Date(company.created_at).toLocaleDateString('ru-RU')}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {company.phone_public && (
              <a href={telHref(company.phone_public)} className="text-gold hover:underline">
                {formatPhone(company.phone_public)}
              </a>
            )}
            {company.owner_email && <span className="text-[#8f8f8f]">{company.owner_email}</span>}
            {company.instagram && (
              <a
                href={`https://instagram.com/${company.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
              >
                Instagram
              </a>
            )}
          </div>

          {company.description && (
            <p className="mt-4 max-w-2xl leading-relaxed text-[#a8a8a8]">{company.description}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              company.status === 'active'
                ? 'bg-[#4b9d63]/20 text-[#7fd39a]'
                : company.status === 'blocked'
                  ? 'bg-[#b91c1c]/20 text-[#f0908f]'
                  : 'bg-[#e8c14a]/20 text-[#e8c14a]'
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
              className="text-sm text-gold hover:underline"
            >
              Открыть страницу →
            </Link>
          )}
        </div>
      </section>

      {/* Цифры */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-white">Показатели</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Просмотры страницы" value={company.views_count} />
          <Metric label="Клиентов" value={company.clients_count} />
          <Metric label="Заявок всего" value={company.orders_total} />
          <Metric
            label="Мебель в каталоге"
            value={`${company.products_active} / ${company.products_total}`}
          />
        </div>

        <p className="mt-3 text-xs text-[#6b6b6b]">
          Контакты клиентов мастера площадке не видны — это его база. Здесь только счёт.
        </p>
      </section>

      {/* Воронка */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-white">Как идут заявки</h3>

        {company.orders_total === 0 ? (
          <p className="rounded-3xl border border-dashed border-[#3a3a3a] p-8 text-center text-[#8f8f8f]">
            Заявок пока не было.
          </p>
        ) : (
          <div className="space-y-3 rounded-3xl bg-[#1f1f1f] p-6">
            {funnel.map(([status, count]) => {
              const share = company.orders_total
                ? Math.round((count / company.orders_total) * 100)
                : 0

              return (
                <div key={status} className="flex items-center gap-4">
                  <span className="w-32 shrink-0 text-sm text-[#8f8f8f]">
                    {ORDER_STATUSES[status]}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#2a2a2a]">
                    <span
                      className="block h-full rounded-full bg-gold"
                      style={{ width: `${share}%` }}
                      aria-hidden
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold text-white">
                    {count}
                  </span>
                </div>
              )
            })}

            {company.revenue_done > 0 && (
              <div className="mt-5 border-t border-[#2c2c2c] pt-4 text-sm text-[#a8a8a8]">
                Сумма завершённых заказов:{' '}
                <strong className="text-gold">{formatPrice(company.revenue_done)}</strong>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Решения по мастерской */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-white">Действия</h3>

        {company.moderation_note && (
          <p className="mb-4 rounded-2xl bg-[#1f1f1f] px-4 py-3 text-sm text-[#a8a8a8]">
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
                className="press rounded-full bg-gold px-6 py-2.5 font-semibold text-white transition-colors hover:bg-gold-deep"
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
                className="rounded-full bg-[#2a2a2a] px-4 py-2.5 text-sm text-white outline-none placeholder:text-[#6b6b6b] focus:ring-2 focus:ring-gold"
              />
              <button
                type="submit"
                className="press rounded-full bg-[#2a2a2a] px-6 py-2.5 text-sm text-[#a8a8a8] transition-colors hover:bg-[#b91c1c] hover:text-white"
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
                className="press rounded-full bg-[#2a2a2a] px-6 py-2.5 text-sm text-[#d6d6d6] transition-colors hover:bg-white hover:text-[#171717]"
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
