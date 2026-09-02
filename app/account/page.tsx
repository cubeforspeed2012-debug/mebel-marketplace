import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { formatPhone } from '@/lib/constants'
import { ORDER_STATUSES, STATUS_STYLES, type OrderStatus } from '@/lib/orders'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Мои заявки' }

type Row = {
  id: number
  status: OrderStatus
  title: string | null
  comment: string | null
  created_at: string
  companies: { id: number; name: string; slug: string | null; phone_public: string | null } | null
}

export default async function AccountPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth?role=buyer&next=/account')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  // Мастера ведём в его кабинет — там другой набор дел.
  if (profile?.role === 'seller') redirect('/dashboard')

  const { data } = await supabase
    .from('orders')
    .select('id, status, title, comment, created_at, companies (id, name, slug, phone_public)')
    .order('created_at', { ascending: false })
    .limit(100)

  const orders = (data ?? []) as unknown as Row[]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Личный кабинет
          </div>
          <h1 className="display mt-1 text-xl">{profile?.full_name ?? 'Покупатель'}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/catalog"
            className="bg-gold px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-gold"
          >
            В каталог
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="border border-line px-4 py-2 text-sm text-text-muted transition-colors hover:border-gold hover:text-text"
            >
              Выйти
            </button>
          </form>
        </div>
      </div>

      <h2 className="display gold-rule text-lg">Мои заявки</h2>

      <div className="mt-7 space-y-3">
        {orders.length === 0 ? (
          <div className="border border-dashed border-line bg-paper p-12 text-center">
            <p className="text-text-muted">
              Заявок пока нет. Найдите мебель в каталоге и оставьте заявку мастеру —
              она появится здесь.
            </p>
            <Link
              href="/catalog"
              className="mt-5 inline-block bg-gold px-6 py-3 font-semibold text-ink transition-colors hover:bg-ink hover:text-gold"
            >
              Смотреть каталог
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="border border-line bg-paper p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                    STATUS_STYLES[order.status] ?? ''
                  }`}
                >
                  {ORDER_STATUSES[order.status] ?? order.status}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {order.title ?? 'Заявка'}
                  </span>
                  <span className="block text-sm text-text-muted">
                    {order.companies?.name}
                    {' · '}
                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </span>

                {order.companies?.phone_public && (
                  <a
                    href={`tel:${order.companies.phone_public.replace(/\s/g, '')}`}
                    className="border border-line px-4 py-2 text-sm transition-colors hover:border-gold"
                  >
                    {formatPhone(order.companies.phone_public)}
                  </a>
                )}

                {order.companies && (
                  <Link
                    href={`/company/${order.companies.slug ?? order.companies.id}`}
                    className="text-sm font-semibold text-gold-deep hover:underline"
                  >
                    Мастер →
                  </Link>
                )}
              </div>

              {order.comment && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-muted">
                  {order.comment}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
