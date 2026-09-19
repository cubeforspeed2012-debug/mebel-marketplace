import { closeSupportTicket } from '@/app/admin/actions'
import { SubmitButton } from '@/components/submit-button'
import { requireAdmin } from '@/lib/session'

export const metadata = { title: 'Поддержка' }

type Ticket = {
  id: number
  contact: string | null
  page: string | null
  status: 'open' | 'done'
  admin_note: string | null
  created_at: string
  transcript: { role: 'user' | 'assistant'; text: string }[]
}

/**
 * Обращения, с которыми помощник не справился. Переписка целиком —
 * администратор читает и отвечает человеку по контакту, не переспрашивая.
 */
export default async function AdminSupportPage() {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('support_tickets')
    .select('id, contact, page, status, admin_note, created_at, transcript')
    .order('status', { ascending: false }) // open раньше done
    .order('created_at', { ascending: false })
    .limit(100)

  const tickets = (data ?? []) as Ticket[]
  const open = tickets.filter((t) => t.status === 'open')
  const done = tickets.filter((t) => t.status === 'done')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Обращения в поддержку</h1>
        <p className="mt-2 text-sm text-text-muted">
          Помощник на ИИ ответил, но человеку этого не хватило. Прочитайте переписку и ответьте по контакту.
        </p>
      </div>

      {open.length === 0 ? (
        <div className="rounded-3xl bg-paper p-12 text-center">
          <div className="text-lg font-semibold text-text">Открытых обращений нет</div>
        </div>
      ) : (
        <div className="space-y-4">
          {open.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <details className="rounded-3xl bg-paper p-5">
          <summary className="cursor-pointer text-sm font-semibold text-text-muted">
            Закрытые: {done.length}
          </summary>
          <div className="mt-4 space-y-4">
            {done.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="rounded-3xl bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-text">
            #{ticket.id} · {ticket.contact || 'контакт не указан'}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {new Date(ticket.created_at).toLocaleString('ru-RU')}
            {ticket.page && ` · со страницы ${ticket.page}`}
          </div>
        </div>
        {ticket.contact && (
          <a
            href={/@/.test(ticket.contact) ? `mailto:${ticket.contact}` : `tel:${ticket.contact.replace(/[^\d+]/g, '')}`}
            className="press rounded-full bg-sand px-4 py-2 text-sm text-text hover:bg-gold hover:text-white"
          >
            Ответить
          </a>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {ticket.transcript.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                m.role === 'user' ? 'bg-gold/15 text-text' : 'bg-sand text-text-muted'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {ticket.status === 'open' && (
        <form action={closeSupportTicket} className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <input type="hidden" name="id" value={ticket.id} />
          <input
            name="note"
            placeholder="Что ответили (для себя)"
            className="min-w-0 flex-1 rounded-full bg-sand px-4 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-gold"
          />
          <SubmitButton pendingLabel="Закрываем…" className="rounded-full bg-sand px-5 py-2 text-sm text-text hover:bg-gold hover:text-white">
            Закрыть
          </SubmitButton>
        </form>
      )}
      {ticket.admin_note && (
        <p className="mt-3 text-xs text-text-muted">Ответ: {ticket.admin_note}</p>
      )}
    </div>
  )
}
