'use client'

import { useState, useTransition } from 'react'
import { phoneVerifyLink } from '@/app/dashboard/telegram-actions'

function ShieldMark({ done }: { done: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" strokeWidth={1.9}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3.2 5 6v5.4c0 4.2 2.9 7.6 7 9.4 4.1-1.8 7-5.2 7-9.4V6l-7-2.8Z" />
      {done && <path d="m9 12 2 2 4-4" />}
    </svg>
  )
}

/**
 * Подтверждение номера мастера.
 *
 * Номер проверяет Telegram, а не мы: мастер нажимает встроенную кнопку
 * «Поделиться номером», и Telegram присылает тот, на который
 * зарегистрирован аккаунт. Поэтому вписать чужой невозможно.
 *
 * Заранее объясняем, что сейчас произойдёт, и чего бот никогда не спросит:
 * человек идёт в незнакомого бота отдавать телефон — он вправе
 * насторожиться, и лучше ответить на это до того, как он нажмёт.
 */
export function PhoneCard({
  verified,
  hasPhone,
  telegramConnected,
}: {
  verified: boolean
  hasPhone: boolean
  telegramConnected: boolean
}) {
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (verified) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-paper p-5">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-[#e7f6ec] text-[#1f9d55]">
          <ShieldMark done />
        </span>
        <div>
          <div className="font-semibold text-text">Номер подтверждён</div>
          <div className="text-sm text-text-muted">
            В каталоге у вас отметка «номер проверен» — клиенты доверяют таким больше
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-paper p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-sand text-gold">
          <ShieldMark done={false} />
        </span>
        <div>
          <div className="font-semibold text-text">Подтвердите номер</div>
          <div className="text-sm text-text-muted">
            Отметка «номер проверен» в каталоге. Это необязательно, но клиенты чаще звонят тем, у кого она есть
          </div>
        </div>
      </div>

      {!hasPhone ? (
        <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-text-muted">
          Сначала укажите телефон в профиле мастерской — потом его можно будет подтвердить.
        </p>
      ) : !telegramConnected ? (
        <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-text-muted">
          Сначала подключите Telegram кнопкой выше — номер подтверждается через нашего бота.
        </p>
      ) : link ? (
        <>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-4 block rounded-full bg-[#2aabee] px-6 py-3 text-center font-semibold text-white transition-opacity hover:opacity-90"
          >
            Открыть бота
          </a>
          <div className="mt-3 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-text-muted">
            Откроется наш бот <b className="text-text">Mebel</b>. Внизу появится кнопка Telegram
            «Поделиться номером» — нажмите её, больше ничего делать не нужно.
            <br />
            <br />
            Номер увидим только мы, в каталоге он не появится: там будет лишь отметка, что он проверен.
            <br />
            <br />
            <b className="text-text">Бот никогда не просит</b> пароль, код из СМС, номер карты и деньги.
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null)
              const result = await phoneVerifyLink()
              if (result.link) setLink(result.link)
              else setError(result.error ?? 'Не получилось')
            })
          }
          className="press mt-4 w-full rounded-full border border-line px-6 py-3 font-semibold text-text transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
        >
          {pending ? 'Готовим…' : 'Подтвердить номер'}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-status-error">{error}</p>}
    </div>
  )
}
