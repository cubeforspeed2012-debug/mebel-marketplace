import Link from 'next/link'
import { TgInit } from '@/components/tg-init'
import { formatPhone, telHref } from '@/lib/constants'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orders'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Кабинет мастера' }

type Lead = {
  id: number
  status: OrderStatus
  title: string | null
  created_at: string
  clients: { full_name: string | null; phone: string | null } | null
}

/** Всё, что показываем на одном экране внутри Telegram. */
async function getScreen() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { state: 'guest' as const }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, status, views_count')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!company) return { state: 'no-company' as const }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [orders, leads, calls, clients] = await Promise.all([
    supabase.from('orders').select('id, status').eq('company_id', company.id),
    supabase
      .from('orders')
      .select('id, status, title, created_at, clients (full_name, phone)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('contact_views')
      .select('visitor', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .gte('day', weekAgo),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id),
  ])

  const all = orders.data ?? []

  return {
    state: 'master' as const,
    company,
    newOrders: all.filter((o) => o.status === 'new').length,
    inWork: all.filter((o) => ['contacted', 'measurement', 'in_progress'].includes(o.status)).length,
    calls: calls.count ?? 0,
    clients: clients.count ?? 0,
    leads: (leads.data ?? []) as unknown as Lead[],
  }
}

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="display mt-1 text-2xl text-text">{value}</div>
      {hint && <div className="text-[0.6875rem] text-text-muted">{hint}</div>}
    </div>
  )
}

export default async function TgPage() {
  const screen = await getScreen()

  return (
    <div className="min-h-screen bg-cream px-4 py-5">
      <TgInit />

      {/* Не вошёл — приветствие и две двери, как ты и просил */}
      {screen.state === 'guest' && (
        <div className="py-8 text-center">
          <div className="display text-2xl text-text">
            Добро пожаловать в Mebel<span className="text-gold">.</span>
          </div>
          <p className="mx-auto mt-3 max-w-xs leading-relaxed text-text-muted">
            Здесь мастер видит свои заявки и цифры, не выходя из Telegram.
            Войдите или заведите кабинет — это бесплатно.
          </p>

          <Link
            href="/auth?next=/tg"
            className="press mt-7 block rounded-full bg-gold px-6 py-3.5 font-semibold text-white"
          >
            Войти
          </Link>
          <Link
            href="/auth?mode=signup&next=/tg"
            className="press mt-3 block rounded-full border border-line bg-paper px-6 py-3.5 font-semibold text-text"
          >
            Зарегистрироваться
          </Link>
        </div>
      )}

      {/* Вошёл, но мастерской ещё нет */}
      {screen.state === 'no-company' && (
        <div className="py-8 text-center">
          <div className="display text-xl text-text">Почти всё</div>
          <p className="mx-auto mt-3 max-w-xs leading-relaxed text-text-muted">
            Осталось завести мастерскую: название, телефон, чем занимаетесь.
            Пара минут — и клиенты смогут вас найти.
          </p>
          <Link
            href="/profile/company"
            className="press mt-6 block rounded-full bg-gold px-6 py-3.5 font-semibold text-white"
          >
            Заполнить профиль
          </Link>
        </div>
      )}

      {screen.state === 'master' && (
        <>
          <div className="display truncate text-xl text-text">{screen.company.name}</div>
          {screen.company.status === 'pending' && (
            <div className="mt-1 text-sm text-status-process">На проверке</div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Tile label="Новые заявки" value={screen.newOrders} />
            <Tile label="В работе" value={screen.inWork} />
            <Tile label="Смотрели страницу" value={screen.company.views_count ?? 0} />
            <Tile label="Хотели позвонить" value={screen.calls} hint="за неделю" />
          </div>

          <div className="mt-5 text-sm font-semibold text-text">Кто оставил заявку</div>

          {screen.leads.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-paper p-5 text-center text-sm leading-relaxed text-text-muted">
              Заявок пока нет. Они появятся здесь, как только покупатель напишет
              со страницы мастерской.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {screen.leads.map((lead) => (
                <li key={lead.id} className="rounded-2xl bg-paper p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-text">
                        {lead.clients?.full_name ?? 'Без имени'}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-text-muted">
                        {new Date(lead.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {' · '}
                        {ORDER_STATUSES[lead.status]}
                        {lead.title && ` · ${lead.title}`}
                      </div>
                    </div>

                    {lead.clients?.phone && (
                      <a
                        href={telHref(lead.clients.phone)}
                        className="press shrink-0 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-white"
                      >
                        {formatPhone(lead.clients.phone)}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/dashboard"
            className="press mt-5 block rounded-full border border-line bg-paper px-6 py-3 text-center text-sm font-semibold text-text"
          >
            Открыть полный кабинет
          </Link>
        </>
      )}
    </div>
  )
}
