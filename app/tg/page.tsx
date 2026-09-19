import { TgWelcome } from '@/components/tg-welcome'
import { formatPhone, telHref } from '@/lib/constants'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orders'
import { getTgContext } from '@/lib/tg'
import { TgOpenOutside } from '@/components/tg-open-outside'

export const metadata = { title: 'Аналитика' }

type Lead = {
  id: number
  status: OrderStatus
  title: string | null
  created_at: string
  clients: { full_name: string | null; phone: string | null } | null
}

export default async function TgAnalytics({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const context = await getTgContext()
  if (context.state !== 'master') {
    // Вошёл через Google почтой, которой у нас нет, — скажем об этом прямо
    const { error } = await searchParams
    return <TgWelcome state={context.state} error={error} />
  }

  const { supabase, company } = context

  const [orders, leads, clients] = await Promise.all([
    supabase.from('orders').select('id, status').eq('company_id', company.id),
    supabase
      .from('orders')
      .select('id, status, title, created_at, clients (full_name, phone)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
  ])

  const all = orders.data ?? []
  const newOrders = all.filter((o) => o.status === 'new').length
  const inWork = all.filter((o) => ['contacted', 'measurement', 'in_progress'].includes(o.status)).length
  const recent = (leads.data ?? []) as unknown as Lead[]

  return (
    <div className="px-4 py-5">
      <div className="display truncate text-xl text-text">{company.name}</div>
      {company.status === 'pending' && (
        <div className="mt-1 text-sm text-status-process">На проверке</div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Tile label="Новые" value={newOrders} accent={newOrders > 0} />
        <Tile label="В работе" value={inWork} />
        <Tile label="Клиентов" value={clients.count ?? 0} />
      </div>

      <div className="mt-5 text-sm font-semibold text-text">Кто оставил заявку</div>

      {recent.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-paper p-5 text-center text-sm leading-relaxed text-text-muted">
          Заявок пока нет. Они появятся здесь, как только покупатель напишет
          со страницы мастерской.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {recent.map((lead) => (
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

      {/*
        Полный кабинет — это большой сайт, и внутри окошка Telegram он
        не помещается: человек проваливался в витрину и терял свои цифры.
        Отдаём переход самому Telegram — он откроет сайт браузером поверх,
        а мини-приложение останется на месте.
      */}
      <TgOpenOutside
        path="/dashboard"
        className="press mt-5 block rounded-full border border-line bg-paper px-6 py-3 text-center text-sm font-semibold text-text"
      >
        Полный кабинет — откроется в браузере
      </TgOpenOutside>
    </div>
  )
}

function Tile({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? 'bg-gold text-white' : 'bg-paper text-text'}`}>
      <div className={`text-xs ${accent ? 'text-white/80' : 'text-text-muted'}`}>{label}</div>
      <div className="display mt-1 text-2xl">{value}</div>
    </div>
  )
}
