'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { askSupport, callAdmin, type ChatMessage } from './actions'

const GREETING: ChatMessage = {
  role: 'assistant',
  text: 'Здравствуйте. Спросите про регистрацию, мастерскую, работы, заявки или Telegram — отвечу сразу. Если не справлюсь, ниже можно позвать администратора.',
}

/** Что спрашивают чаще всего — одно нажатие вместо набора текста */
const QUICK = [
  'Почему моя работа «на проверке»?',
  'Как подключить Telegram?',
  'Как подтвердить номер?',
  'Не могу войти в аккаунт',
]

/**
 * Чат с поддержкой. Первым отвечает помощник — он знает, как устроен сайт,
 * и закрывает типовые вопросы за секунду. Кнопка «Позвать администратора»
 * появляется после первого же ответа: если помощник не помог, человек не
 * должен ходить кругами. Переписка уходит администратору целиком.
 */
export function SupportChat({ signedInContact }: { signedInContact: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [askingContact, setAskingContact] = useState(false)
  const [contact, setContact] = useState(signedInContact ?? '')
  const [sent, setSent] = useState(false)
  const [sending, startSending] = useTransition()

  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, askingContact, sent])

  const answered = messages.some((m, i) => i > 0 && m.role === 'assistant')

  function send(text: string) {
    const clean = text.trim()
    if (!clean || pending) return
    setError(null)
    setDraft('')

    const next = [...messages, { role: 'user' as const, text: clean }]
    setMessages(next)

    startTransition(async () => {
      const reply = await askSupport(next.filter((m) => m !== GREETING))
      if (reply.error) {
        setError(reply.error)
        return
      }
      setMessages([...next, { role: 'assistant', text: reply.text ?? '' }])
    })
  }

  function submitTicket() {
    startSending(async () => {
      const result = await callAdmin(
        messages.filter((m) => m !== GREETING),
        contact,
        typeof window !== 'undefined' ? window.location.pathname : '/support',
      )
      if (result.error) {
        setError(result.error)
        return
      }
      setSent(true)
      setAskingContact(false)
    })
  }

  return (
    <div className="rounded-[28px] border border-line bg-paper">
      {/* Переписка */}
      <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4 sm:p-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-md bg-gold text-white'
                  : 'rounded-bl-md border border-line bg-cream text-text'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-line bg-cream px-4 py-3 text-sm text-text-muted">
              Печатает…
            </div>
          </div>
        )}

        {sent && (
          <div className="rounded-2xl border border-status-done/40 bg-status-done/10 px-4 py-3 text-sm leading-relaxed text-status-done">
            <b>Администратор получил ваше обращение.</b> Ответим на указанный контакт — обычно в течение дня.
          </div>
        )}

        <div ref={bottom} />
      </div>

      {/* Быстрые вопросы — пока разговор не начался */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="press rounded-full border border-line bg-cream px-3.5 py-2 text-xs text-text transition-colors hover:border-gold"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {error && <p className="px-4 pb-2 text-sm text-status-error sm:px-5">{error}</p>}

      {/* Позвать человека */}
      {answered && !sent && (
        <div className="border-t border-line px-4 py-3 sm:px-5">
          {askingContact ? (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                Куда ответить? Почта или телефон. Переписка выше уйдёт администратору целиком.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+998 90 123-45-67 или почта"
                  className="min-w-0 flex-1 rounded-2xl border border-line bg-cream px-4 py-2.5 text-sm text-text outline-none focus:shadow-[0_0_0_2px_var(--gold)]"
                />
                <button
                  type="button"
                  disabled={sending || !contact.trim()}
                  onClick={submitTicket}
                  className="press rounded-2xl bg-gold px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {sending ? 'Отправляем…' : 'Отправить'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAskingContact(true)}
              className="press w-full rounded-2xl border border-line px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:border-gold hover:text-gold"
            >
              Помощник не помог — позвать администратора
            </button>
          )}
        </div>
      )}

      {/* Ввод */}
      {!sent && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
          className="flex gap-2 border-t border-line p-3 sm:p-4"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Напишите вопрос…"
            maxLength={1200}
            className="min-w-0 flex-1 rounded-2xl border border-line bg-cream px-4 py-3 text-sm text-text outline-none focus:shadow-[0_0_0_2px_var(--gold)]"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="press rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Отправить
          </button>
        </form>
      )}
    </div>
  )
}
