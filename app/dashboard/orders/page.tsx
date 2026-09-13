import Link from 'next/link'
import { formatPhone, formatPrice, telHref } from '@/lib/constants'
import { ORDER_SOURCES, ORDER_STATUSES, STATUS_STYLES, type OrderStatus } from '@/lib/orders'
import { getSellerContext } from '@/lib/session'
import type { OrderWithClient } from '@/lib/types'
import { deleteOrder, updateOrderDetails, updateOrderStatus } from './actions'
import { NewOrderForm } from './new-order-form'

export const metadata = { title: 'Заказы' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filter } = await searchParams
  const { supabase, company } = await getSellerContext()

  if (!company) {
    return (
      <div>
        <h2 className="display gold-rule text-xl">Заказы</h2>
        <div className="mt-7 rounded-3xl rounded-3xl border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-text-muted">
            Заявки приходят на страницу мастерской. Сначала создайте её.
          </p>
          <Link
            href="/profile"
            className="mt-5 inline-block bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
          >
            Заполнить профиль
          </Link>
        </div>
      </div>
    )
  }

  let query = supabase
    .from('orders')
    .select('*, clients (id, full_name, phone), products (id, title)')
    .eq('company_id', company.id)

  if (filter && filter in ORDER_STATUSES) query = query.eq('status', filter)

  const { data } = await query.order('created_at', { ascending: false }).limit(200)
  const orders = (data ?? []) as unknown as OrderWithClient[]

  // Счётчики по этапам — чтобы видеть, где затык
  const counts = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display gold-rule text-xl">Заказы</h2>
        <NewOrderForm />
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
        Сюда попадают все, кто хочет у вас заказать: заявки со страницы мастерской и те,
        кого вы записали сами. Нажмите на заявку — увидите телефон, что нужно человеку, и
        сможете отметить, на каком вы этапе: созвонились, съездили на замер, делаете,
        отдали. Так ни один клиент не потеряется.
      </p>

      {/* Фильтр по этапам воронки */}
      <div className="mt-7 flex flex-wrap gap-2">
        <Link
          href="/dashboard/orders"
          className={`press rounded-full px-4 py-2 text-sm transition-colors ${
            !filter ? 'bg-gold font-semibold text-white' : 'bg-paper text-text-muted hover:text-text'
          }`}
        >
          Все
        </Link>
        {Object.entries(ORDER_STATUSES).map(([value, label]) => (
          <Link
            key={value}
            href={`/dashboard/orders?status=${value}`}
            className={`press rounded-full px-4 py-2 text-sm transition-colors ${
              filter === value
                ? 'bg-gold font-semibold text-white'
                : 'bg-paper text-text-muted hover:text-text'
            }`}
          >
            {label}
            {!filter && counts[value] ? (
              <span className="ml-1.5 text-xs">{counts[value]}</span>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="mt-7 space-y-4">
        {orders.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line bg-paper p-10 text-center">
            <p className="mx-auto max-w-md leading-relaxed text-text-muted">
              Заявок пока нет. Они придут сами, когда покупатель нажмёт «Оставить заявку»
              на вашей странице. А если клиент позвонил напрямую — запишите его кнопкой
              «Добавить заказ», чтобы не забыть перезвонить.
            </p>
          </div>
        )}

        {orders.map((order) => (
          <details key={order.id} className="rounded-3xl bg-paper">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4">
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  STATUS_STYLES[order.status as OrderStatus] ?? ''
                }`}
              >
                {ORDER_STATUSES[order.status as OrderStatus] ?? order.status}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {order.clients?.full_name ?? 'Без имени'}
                  {order.clients?.phone && (
                    <span className="ml-2 font-normal text-text-muted">
                      {formatPhone(order.clients.phone)}
                    </span>
                  )}
                </span>
                <span className="block truncate text-sm text-text-muted">
                  {order.title ?? order.products?.title ?? 'Заявка'} ·{' '}
                  {ORDER_SOURCES[order.source as keyof typeof ORDER_SOURCES] ?? order.source} ·{' '}
                  {formatDate(order.created_at)}
                </span>
              </span>

              {order.clients?.phone && (
                <a
                  href={telHref(order.clients.phone)}
                  className="bg-gold px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-deep"
                >
                  Позвонить
                </a>
              )}
            </summary>

            <div className="space-y-5 border-t border-line p-4">
              {order.comment && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                    Что просят
                  </div>
                  <p className="mt-1 whitespace-pre-line leading-relaxed">{order.comment}</p>
                </div>
              )}

              {/* Этап воронки */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Этап
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ORDER_STATUSES).map(([value, label]) => (
                    <form key={value} action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value={value} />
                      <button
                        type="submit"
                        disabled={order.status === value}
                        className={`border px-3 py-1.5 text-sm transition-colors ${
                          order.status === value
                            ? 'border-gold bg-gold font-semibold text-white'
                            : 'border-line hover:border-gold'
                        }`}
                      >
                        {label}
                      </button>
                    </form>
                  ))}
                </div>
              </div>

              {/* Детали сделки */}
              <form action={updateOrderDetails} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={order.id} />

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
                    Сумма заказа, сум
                  </span>
                  <input
                    name="total_price"
                    inputMode="numeric"
                    defaultValue={order.total_price ?? ''}
                    className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none focus:border-gold"
                  />
                  {order.total_price ? (
                    <span className="mt-1 block text-xs text-text-muted">
                      {formatPrice(order.total_price)}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
                    Дата замера
                  </span>
                  <input
                    name="measurement_visit_date"
                    type="date"
                    defaultValue={order.measurement_visit_date ?? ''}
                    className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none focus:border-gold"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
                    Заметка
                  </span>
                  <textarea
                    name="comment"
                    rows={3}
                    defaultValue={order.comment ?? ''}
                    className="w-full rounded-[var(--radius)] border border-line px-4 py-2.5 outline-none focus:border-gold"
                  />
                </label>

                <div className="flex gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    className="border border-line px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-sand"
                  >
                    Сохранить
                  </button>
                </div>
              </form>

              <form action={deleteOrder}>
                <input type="hidden" name="id" value={order.id} />
                <button
                  type="submit"
                  className="text-sm text-text-muted transition-colors hover:text-status-error"
                >
                  Удалить заказ
                </button>
              </form>
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
