'use client'

import { useState, useTransition } from 'react'
import { connectTelegram, disconnectTelegram } from '@/app/dashboard/telegram-actions'

function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M21.94 4.6 18.9 19.02c-.23 1.01-.83 1.26-1.68.79l-4.64-3.42-2.24 2.16c-.25.25-.46.46-.94.46l.33-4.73 8.6-7.77c.37-.33-.08-.52-.58-.19l-10.63 6.7-4.58-1.43c-1-.31-1.01-1 .21-1.48l17.9-6.9c.83-.3 1.56.2 1.29 1.39Z" />
    </svg>
  )
}

/**
 * Подключение заявок в Telegram. Ссылка на бота одноразовая и живёт
 * 15 минут, поэтому выдаём её по нажатию, а не держим на странице.
 */
export function TelegramCard({ connected }: { connected: boolean }) {
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (connected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-paper p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[#e8f4fc] text-[#2aabee]">
            <TelegramMark />
          </span>
          <div>
            <div className="font-semibold text-text">Заявки приходят в Telegram</div>
            <div className="text-sm text-text-muted">Новая заявка — сразу сообщение в чат</div>
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => { await disconnectTelegram() })}
          className="press rounded-full border border-line px-5 py-2 text-sm text-text-muted transition-colors hover:border-status-error hover:text-status-error disabled:opacity-60"
        >
          Отключить
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-paper p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-[#e8f4fc] text-[#2aabee]">
          <TelegramMark />
        </span>
        <div>
          <div className="font-semibold text-text">Заявки в Telegram</div>
          <div className="text-sm text-text-muted">
            Чтобы не пропустить клиента, пока вы не в приложении
          </div>
        </div>
      </div>

      {link ? (
        <>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-4 block rounded-full bg-[#2aabee] px-6 py-3 text-center font-semibold text-white transition-opacity hover:opacity-90"
          >
            Открыть бота и нажать «Start»
          </a>
          <p className="mt-2 text-xs text-text-muted">
            Ссылка действует 15 минут. После «Start» бот ответит, что всё готово.
          </p>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null)
              const result = await connectTelegram()
              if (result.link) setLink(result.link)
              else setError(result.error ?? 'Не получилось')
            })
          }
          className="press mt-4 w-full rounded-full bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-60"
        >
          {pending ? 'Готовим ссылку…' : 'Подключить Telegram'}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-status-error">{error}</p>}
    </div>
  )
}
