import Link from 'next/link'
import { formatPhone, formatPrice, WORK_TYPES } from '@/lib/constants'
import { requireAdmin } from '@/lib/session'
import { hasAiKey } from '@/lib/groq'
import { confirmPromotion } from './actions'
import { ViewsChart } from './views-chart'

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

/* Крупная плитка со сводкой. Одна из них светлая — на неё падает взгляд первым. */
function Stat({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string
  value: number | string
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-3xl p-5 transition-transform duration-200 hover:-translate-y-0.5 ${
        highlight ? 'bg-white text-[#171717]' : 'bg-[#1f1f1f] text-white'
      }`}
    >
      <div className={`text-sm ${highlight ? 'text-[#6b6b6b]' : 'text-[#8f8f8f]'}`}>{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      {hint && (
        <div className={`mt-2 text-xs ${highlight ? 'text-[#8a8a8a]' : 'text-[#6b6b6b]'}`}>
          {hint}
        </div>
      )}
    </div>
  )
}

/* Цветная плитка воронки — цвет закреплён за этапом, чтобы читалось с одного взгляда */
function Funnel({
  label,
  value,
  caption,
  tone,
}: {
  label: string
  value: number
  caption: string
  tone: 'blue' | 'orange' | 'yellow' | 'green'
}) {
  const tones = {
    blue: 'bg-[#3f6fd8] text-white',
    orange: 'bg-[#e07a3f] text-white',
    yellow: 'bg-[#e8c14a] text-[#3b2f10]',
    green: 'bg-[#4b9d63] text-white',
  }

  return (
    <div className={`rounded-3xl p-5 ${tones[tone]}`}>
      <div className="text-sm opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-xs opacity-75">{caption}</div>
    </div>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filter } = await searchParams
  const { supabase, profile } = await requireAdmin()

  const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [overviewResult, companiesResult, promotionsResult, visitsResult] = await Promise.all([
    supabase.rpc('admin_overview'),
    supabase.rpc('admin_company_stats'),
    supabase
      .from('promotions')
      .select('*, companies (id, name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('site_visits').select('day, views').gte('day', since).order('day'),
  ])

  const overview = (overviewResult.data?.[0] ?? null) as Overview | null
  const allCompanies = (companiesResult.data ?? []) as CompanyStats[]
  const companies = filter ? allCompanies.filter((c) => c.status === filter) : allCompanies
  const promotions = promotionsResult.data ?? []

  // Воронка по всей площадке — складываем счётчики мастерских
  const sum = (pick: (c: CompanyStats) => number) => allCompanies.reduce((t, c) => t + pick(c), 0)
  const newOrders = sum((c) => c.new_orders)
  const doneOrders = sum((c) => c.done_orders)
  const totalOrders = overview?.orders_total ?? sum((c) => c.orders_count)
  const inWork = Math.max(0, totalOrders - newOrders - doneOrders)

  // Дни без посещений в базе не хранятся — дорисуем нулями, иначе график «рвётся»
  const visitsByDay = new Map(
    (visitsResult.data ?? []).map((v) => [v.day as string, v.views as number]),
  )
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return { day: date, views: visitsByDay.get(date) ?? 0 }
  })

  const name = (profile?.full_name ?? '').split(' ')[0] || 'администратор'

  // Само значение не показываем и не логируем — только факт наличия
  const aiReady = await hasAiKey()

  return (
    <div className="space-y-6">
      {/* Приветствие */}
      <div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Привет, {name} 👋</h1>
        <p className="mt-2 text-sm text-[#8f8f8f]">
          Вся площадка перед вами: посещения, мастерские и заявки.
        </p>
      </div>

      {/* Сводка */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Просмотров сегодня"
          value={overview?.views_today ?? 0}
          hint={`За неделю ${overview?.views_week ?? 0} · всего ${overview?.views_total ?? 0}`}
          highlight
        />
        <Stat
          label="Мастерских в каталоге"
          value={overview?.companies_active ?? 0}
          hint={`На проверке ${overview?.companies_pending ?? 0} · всего ${overview?.companies_total ?? 0}`}
        />
        <Stat
          label="Заявок всего"
          value={totalOrders}
          hint={`Новых ${overview?.orders_new ?? newOrders}`}
        />
        <Stat
          label="Мебели в каталоге"
          value={overview?.products_total ?? 0}
          hint={`Клиентов у мастеров ${overview?.clients_total ?? 0}`}
        />
      </div>

      {/* График и воронка */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ViewsChart days={days} />
          <p className="mt-3 text-xs leading-relaxed text-[#6b6b6b]">
            Просмотры считаются при каждом открытии страницы мастера или товара —
            это не уникальные люди, а обращения к площадке.
          </p>

          {/* Видит ли сайт ключ помощника. Само значение не показываем и не пишем в логи */}
          <p className="mt-3 flex items-center gap-2 text-xs text-[#6b6b6b]">
            <span
              className={`size-2 rounded-full ${aiReady ? 'bg-[#4b9d63]' : 'bg-[#b91c1c]'}`}
              aria-hidden
            />
            Помощник для мастеров: {aiReady ? 'ключ на месте' : 'ключа нет'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Funnel label="Новые заявки" value={newOrders} caption="ждут звонка мастера" tone="blue" />
          <Funnel label="В работе" value={inWork} caption="замер, договор, производство" tone="orange" />
          <Link href="/admin/approvals" className="block">
            <Funnel
              label="Мастерские на проверке"
              value={overview?.companies_pending ?? 0}
              caption="нажмите, чтобы разобрать"
              tone="yellow"
            />
          </Link>
          <Funnel label="Завершено" value={doneOrders} caption="мебель у клиента" tone="green" />
        </div>
      </div>

      {/* Ждут подтверждения оплаты */}
      {promotions.length > 0 && (
        <section className="rounded-3xl bg-[#1f1f1f] p-6">
          <h2 className="text-lg font-semibold text-white">Продвижение ждёт оплаты</h2>
          <div className="mt-4 space-y-3">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl bg-[#171717] p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">
                    {(promo.companies as { name?: string } | null)?.name ?? 'Мастерская'}
                  </div>
                  <div className="text-sm text-[#8f8f8f]">
                    {promo.hours} ч · {formatPrice(promo.amount)} ·{' '}
                    {new Date(promo.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <form action={confirmPromotion}>
                  <input type="hidden" name="id" value={promo.id} />
                  <button
                    type="submit"
                    className="press rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-deep"
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
      <section className="rounded-3xl bg-[#1f1f1f] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Мастерские</h2>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className={`press rounded-full px-4 py-2 text-sm transition-colors ${
                !filter
                  ? 'bg-white font-semibold text-[#171717]'
                  : 'bg-[#2a2a2a] text-[#a8a8a8] hover:text-white'
              }`}
            >
              Все
            </Link>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <Link
                key={value}
                href={`/admin?status=${value}`}
                className={`press rounded-full px-4 py-2 text-sm transition-colors ${
                  filter === value
                    ? 'bg-white font-semibold text-[#171717]'
                    : 'bg-[#2a2a2a] text-[#a8a8a8] hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {companies.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#3a3a3a] p-12 text-center text-[#8f8f8f]">
            Мастерских пока нет.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs text-[#6b6b6b]">
                <tr>
                  <th className="px-4 py-3 font-normal">Мастерская</th>
                  <th className="px-4 py-3 font-normal">Статус</th>
                  <th className="px-4 py-3 text-right font-normal">Просмотры</th>
                  <th className="px-4 py-3 text-right font-normal">Мебель</th>
                  <th className="px-4 py-3 text-right font-normal">Клиенты</th>
                  <th className="px-4 py-3 text-right font-normal">Заявки</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.company_id}
                    className="border-t border-[#2c2c2c] transition-colors hover:bg-[#242424]"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/company/${company.company_id}`}
                        className="font-semibold text-white hover:text-gold"
                      >
                        {company.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-[#8f8f8f]">
                        {company.work_type && WORK_TYPES[company.work_type]}
                        {company.district && ` · ${company.district}`}
                        {company.phone_public && ` · ${formatPhone(company.phone_public)}`}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          company.status === 'active'
                            ? 'bg-[#4b9d63]/20 text-[#7fd39a]'
                            : company.status === 'blocked'
                              ? 'bg-[#b91c1c]/20 text-[#f0908f]'
                              : 'bg-[#e8c14a]/20 text-[#e8c14a]'
                        }`}
                      >
                        {STATUS_LABEL[company.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-[#d6d6d6]">{company.views_count}</td>
                    <td className="px-4 py-4 text-right text-[#d6d6d6]">{company.products_count}</td>
                    <td className="px-4 py-4 text-right text-[#d6d6d6]">{company.clients_count}</td>
                    <td className="px-4 py-4 text-right text-[#d6d6d6]">
                      {company.orders_count}
                      {company.new_orders > 0 && (
                        <span className="ml-1.5 rounded-full bg-[#3f6fd8] px-2 py-0.5 text-xs font-semibold text-white">
                          {company.new_orders}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/admin/company/${company.company_id}`}
                        className="press rounded-full bg-[#2a2a2a] px-4 py-2 text-xs text-[#d6d6d6] transition-colors hover:bg-white hover:text-[#171717]"
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
