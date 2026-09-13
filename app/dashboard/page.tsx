import Link from 'next/link'
import { formatPhone, telHref } from '@/lib/constants'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orders'
import { getSellerContext } from '@/lib/session'

export const metadata = { title: 'Аналитика' }

type RecentOrder = {
  id: number
  status: OrderStatus
  title: string | null
  created_at: string
  clients: { full_name: string | null; phone: string | null } | null
}

function Tile({
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
      className={`lift block rounded-3xl p-5 ${accent ? 'bg-gold text-white' : 'bg-paper text-text'}`}
    >
      <div className={`text-sm ${accent ? 'text-white/80' : 'text-text-muted'}`}>{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </Link>
  )
}

/**
 * Аналитика — один экран, с которого мастер начинает день:
 * сколько новых заявок, кто последний написал, как идут дела.
 */
export default async function DashboardPage() {
  const { supabase, company } = await getSellerContext()

  // Мастерской ещё нет — сначала заполнить профиль, иначе показывать нечего
  if (!company) {
    return (
      <div className="rounded-3xl bg-paper p-8">
        <h2 className="display text-xl text-text">Начнём с профиля</h2>
        <p className="mt-4 max-w-xl leading-relaxed text-text-muted">
          Название мастерской, телефон, чем занимаетесь — пара минут, и покупатели
          смогут вас найти. Потом добавите фото работ.
        </p>
        <Link
          href="/profile"
          className="press mt-6 inline-block rounded-full bg-gold px-7 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
        >
          Заполнить профиль
        </Link>
      </div>
    )
  }

  const [ordersResult, productsResult, clientsResult, recentResult] = await Promise.all([
    supabase.from('orders').select('id, status').eq('company_id', company.id),
    supabase.from('products').select('id, status').eq('company_id', company.id),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
    supabase
      .from('orders')
      .select('id, status, title, created_at, clients (full_name, phone)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const orders = ordersResult.data ?? []
  const newOrders = orders.filter((o) => o.status === 'new').length
  const inWork = orders.filter((o) =>
    ['contacted', 'measurement', 'in_progress'].includes(o.status),
  ).length
  const done = orders.filter((o) => o.status === 'done').length
  const activeProducts = (productsResult.data ?? []).filter((p) => p.status === 'active').length
  const recent = (recentResult.data ?? []) as unknown as RecentOrder[]

  return (
    <div className="space-y-5">
      {company.status === 'blocked' && (
        <div className="rounded-3xl bg-status-error/15 p-5 text-sm leading-relaxed text-text">
          <span className="font-semibold">Мастерская скрыта из каталога.</span>{' '}
          {company.moderation_note ? `Причина: ${company.moderation_note}.` : ''} Поправьте
          профиль и напишите администратору — вас вернут.
        </div>
      )}

      {/* Главные цифры */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label="Новые заявки" value={newOrders} href="/dashboard/orders?status=new" accent={newOrders > 0} />
        <Tile label="В работе" value={inWork} href="/dashboard/orders" />
        <Tile label="Просмотры страницы" value={company.views_count ?? 0} href={`/company/${company.slug ?? company.id}`} />
        <Tile label="Клиентов" value={clientsResult.count ?? 0} href="/dashboard/clients" />
      </div>

      {/* Последние заявки — то, ради чего мастер открыл приложение */}
      <section className="rounded-3xl bg-paper p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="display text-lg text-text">Последние заявки</h2>
          <Link href="/dashboard/orders" className="text-sm font-semibold text-gold hover:underline">
            Все заказы →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm leading-relaxed text-text-muted">
            Заявок пока нет. Они появятся здесь, когда покупатель напишет вам со страницы
            мастерской или товара.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-text">
                    {order.clients?.full_name ?? 'Без имени'}
                    {order.title && <span className="font-normal text-text-muted"> · {order.title}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    {' · '}
                    {ORDER_STATUSES[order.status]}
                  </div>
                </div>
                {order.clients?.phone && (
                  <a
                    href={telHref(order.clients.phone)}
                    className="press rounded-full bg-gold px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-deep"
                  >
                    {formatPhone(order.clients.phone)}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Коротко о делах и две кнопки, которые нужны чаще всего */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-paper p-5">
          <div className="text-sm text-text-muted">Завершено заказов</div>
          <div className="mt-2 text-2xl font-semibold text-text">{done}</div>
        </div>
        <Link href="/dashboard/products" className="lift rounded-3xl bg-paper p-5 transition-colors hover:bg-sand">
          <div className="text-sm text-text-muted">Работ в каталоге</div>
          <div className="mt-2 text-2xl font-semibold text-text">{activeProducts}</div>
        </Link>
        <Link href="/dashboard/promotion" className="lift rounded-3xl bg-paper p-5 transition-colors hover:bg-sand">
          <div className="font-semibold text-text">Поднять в каталоге</div>
          <div className="mt-1 text-sm text-text-muted">Ваша мебель встанет выше других</div>
        </Link>
      </div>
    </div>
  )
}
