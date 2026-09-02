import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { formatPhone, formatPrice, WORK_TYPES } from '@/lib/constants'
import { requireAdmin } from '@/lib/session'
import type { Company } from '@/lib/types'
import { confirmPromotion, setCompanyStatus } from './actions'

export const metadata = { title: 'Управление площадкой' }

const STATUS_LABEL: Record<string, string> = {
  pending: 'На проверке',
  active: 'В каталоге',
  blocked: 'Заблокирована',
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filter } = await searchParams
  const { supabase } = await requireAdmin()

  let companiesQuery = supabase.from('companies').select('*')
  if (filter && filter in STATUS_LABEL) companiesQuery = companiesQuery.eq('status', filter)

  const [companiesResult, promotionsResult, statsResult] = await Promise.all([
    companiesQuery.order('created_at', { ascending: false }).limit(200),
    supabase
      .from('promotions')
      .select('*, companies (id, name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('companies').select('id, status'),
  ])

  const companies = (companiesResult.data ?? []) as Company[]
  const promotions = promotionsResult.data ?? []
  const all = statsResult.data ?? []
  const pendingCount = all.filter((c) => c.status === 'pending').length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Площадка
          </div>
          <h1 className="display mt-1 text-xl">Управление</h1>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="border border-line px-4 py-2 text-sm text-text-muted transition-colors hover:border-gold hover:text-text"
          >
            Выйти
          </button>
        </form>
      </div>

      {/* Ждут оплаты */}
      {promotions.length > 0 && (
        <section className="mb-10">
          <h2 className="display gold-rule text-lg">Продвижение ждёт подтверждения</h2>
          <div className="mt-6 space-y-3">
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
                    className="bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-gold"
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="display gold-rule text-lg">Мастерские</h2>
          {pendingCount > 0 && (
            <span className="bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ink">
              На проверке: {pendingCount}
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin"
            className={`border px-4 py-2 text-sm transition-colors ${
              !filter
                ? 'border-gold bg-gold font-semibold text-ink'
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
                  ? 'border-gold bg-gold font-semibold text-ink'
                  : 'border-line bg-paper text-text-muted hover:border-gold'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {companies.length === 0 && (
            <div className="border border-dashed border-line bg-paper p-10 text-center text-text-muted">
              Мастерских пока нет.
            </div>
          )}

          {companies.map((company) => (
            <div key={company.id} className="border border-line bg-paper p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="size-14 shrink-0 overflow-hidden bg-cream">
                  {company.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="display flex h-full items-center justify-center text-gold-deep">
                      {company.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{company.name}</div>
                  <div className="mt-1 text-sm text-text-muted">
                    {company.work_type && WORK_TYPES[company.work_type]}
                    {company.district && ` · ${company.district}`}
                    {company.phone_public && ` · ${formatPhone(company.phone_public)}`}
                  </div>
                  {company.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                      {company.description}
                    </p>
                  )}
                </div>

                <span
                  className={`px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                    company.status === 'active'
                      ? 'bg-gold text-ink'
                      : company.status === 'blocked'
                        ? 'bg-neutral-300 text-neutral-700'
                        : 'border border-gold text-gold-deep'
                  }`}
                >
                  {STATUS_LABEL[company.status]}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {company.status !== 'active' && (
                  <form action={setCompanyStatus}>
                    <input type="hidden" name="id" value={company.id} />
                    <input type="hidden" name="status" value="active" />
                    <button
                      type="submit"
                      className="bg-gold px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-gold"
                    >
                      Одобрить
                    </button>
                  </form>
                )}

                {company.status !== 'blocked' && (
                  <form action={setCompanyStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={company.id} />
                    <input type="hidden" name="status" value="blocked" />
                    <input
                      name="note"
                      placeholder="Причина блокировки"
                      className="border border-line px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                    <button
                      type="submit"
                      className="border border-line px-5 py-2 text-sm text-text-muted transition-colors hover:border-red-400 hover:text-red-700"
                    >
                      Заблокировать
                    </button>
                  </form>
                )}

                {company.status === 'active' && (
                  <Link
                    href={`/company/${company.slug ?? company.id}`}
                    className="border border-line px-5 py-2 text-sm transition-colors hover:border-gold"
                  >
                    Открыть страницу
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
