import Link from 'next/link'
import { formatPhone } from '@/lib/constants'
import { ORDER_SOURCES } from '@/lib/orders'
import { getSellerContext } from '@/lib/session'
import type { Client } from '@/lib/types'

export const metadata = { title: 'Клиенты' }

type ClientRow = Client & { orders: { id: number; status: string }[] }

export default async function ClientsPage() {
  const { supabase, company } = await getSellerContext()

  if (!company) {
    return (
      <div>
        <h2 className="display gold-rule text-xl">Клиенты</h2>
        <div className="mt-7 border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-text-muted">Сначала создайте профиль мастерской.</p>
          <Link
            href="/dashboard/company"
            className="mt-5 inline-block bg-gold px-6 py-3 font-semibold text-ink transition-colors hover:bg-ink hover:text-gold"
          >
            Заполнить профиль
          </Link>
        </div>
      </div>
    )
  }

  const { data } = await supabase
    .from('clients')
    .select('*, orders (id, status)')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(300)

  const clients = (data ?? []) as unknown as ClientRow[]

  return (
    <div>
      <h2 className="display gold-rule text-xl">Клиенты</h2>
      <p className="mt-5 mb-7 max-w-2xl leading-relaxed text-text-muted">
        Ваша база: все, кто оставлял заявку или кого вы завели вручную. Видна только вам.
      </p>

      {clients.length === 0 ? (
        <div className="border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-text-muted">
            Клиентов пока нет. Они появятся автоматически с первой заявкой.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-b border-line text-xs font-semibold uppercase tracking-widest text-text-muted">
              <tr>
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Откуда</th>
                <th className="px-4 py-3">Заказов</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{client.full_name}</td>
                  <td className="px-4 py-3 text-text-muted">{formatPhone(client.phone)}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {ORDER_SOURCES[client.source as keyof typeof ORDER_SOURCES] ??
                      client.source ??
                      '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{client.orders?.length ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    {client.phone && (
                      <a
                        href={`tel:+${client.phone}`}
                        className="bg-gold px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-gold"
                      >
                        Позвонить
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
