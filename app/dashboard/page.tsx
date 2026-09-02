import Link from 'next/link'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orders'
import { getSellerContext } from '@/lib/session'

export const metadata = { title: 'Обзор' }

function Stat({
  label,
  value,
  href,
  accent = false,
}: {
  label: string
  value: number | string
  href: string
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className={`block border p-5 transition-colors ${
        accent ? 'border-gold bg-gold/10' : 'border-line bg-paper hover:border-gold'
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="display mt-2 text-3xl">{value}</div>
    </Link>
  )
}

export default async function DashboardPage() {
  const { supabase, company } = await getSellerContext()

  // Профиль не создан — первым делом отправляем его заполнять.
  if (!company) {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-paper p-8">
        <h2 className="display gold-rule text-xl">Начнём</h2>
        <p className="mt-5 max-w-xl leading-relaxed text-text-muted">
          Чтобы вас нашли покупатели, заполните профиль мастерской: название, телефон,
          район и чем занимаетесь. Это занимает пару минут.
        </p>
        <Link
          href="/dashboard/company"
          className="mt-6 inline-block bg-gold px-7 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
        >
          Заполнить профиль мастерской
        </Link>
      </div>
    )
  }

  const [ordersResult, productsResult, clientsResult] = await Promise.all([
    supabase.from('orders').select('id, status').eq('company_id', company.id),
    supabase.from('products').select('id, status').eq('company_id', company.id),
    supabase.from('clients').select('id').eq('company_id', company.id),
  ])

  const orders = ordersResult.data ?? []
  const products = productsResult.data ?? []
  const newOrders = orders.filter((o) => o.status === 'new').length
  const inWork = orders.filter((o) =>
    ['contacted', 'measurement', 'in_progress'].includes(o.status),
  ).length
  const activeProducts = products.filter((p) => p.status === 'active').length

  return (
    <div className="space-y-8">
      {company.status === 'pending' && (
        <div className="border border-gold bg-gold/10 p-5">
          <div className="font-semibold">Мастерская на проверке</div>
          <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
            Администратор проверит профиль и откроет вас в каталоге. Пока можно добавить
            мебель — она появится вместе с мастерской.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Новых заявок"
          value={newOrders}
          href="/dashboard/orders?status=new"
          accent={newOrders > 0}
        />
        <Stat label="В работе" value={inWork} href="/dashboard/orders" />
        <Stat label="Мебель в каталоге" value={activeProducts} href="/dashboard/products" />
        <Stat label="Клиентов" value={clientsResult.data?.length ?? 0} href="/dashboard/clients" />
      </div>

      {/* Воронка одним взглядом */}
      <div className="rounded-[var(--radius)] border border-line bg-paper p-6">
        <h3 className="display gold-rule text-lg">Воронка</h3>
        <div className="mt-6 space-y-3">
          {(Object.keys(ORDER_STATUSES) as OrderStatus[]).map((status) => {
            const count = orders.filter((o) => o.status === status).length
            const share = orders.length ? Math.round((count / orders.length) * 100) : 0

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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/products/new"
          className="rounded-[var(--radius)] border border-line bg-paper p-6 transition-colors hover:border-gold"
        >
          <div className="font-semibold">Добавить мебель</div>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Фото, цена, описание — и работа появится в каталоге.
          </p>
        </Link>

        <Link
          href="/dashboard/promotion"
          className="rounded-[var(--radius)] border border-line bg-paper p-6 transition-colors hover:border-gold"
        >
          <div className="font-semibold">Поднять в каталоге</div>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Платное продвижение: ваша мебель встаёт выше других.
          </p>
        </Link>
      </div>
    </div>
  )
}
