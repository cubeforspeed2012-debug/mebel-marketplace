'use client'

import { useState, useTransition } from 'react'
import { connectTelegram, phoneVerifyLink } from '@/app/dashboard/telegram-actions'
import { confirmPhoneCode, sendPhoneCode } from '@/app/dashboard/phone-actions'

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
  gateway = false,
}: {
  verified: boolean
  hasPhone: boolean
  telegramConnected: boolean
  /** Включена отправка кода от Telegram («Verification Codes») */
  gateway?: boolean
}) {
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [viaBot, setViaBot] = useState(!gateway)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [tail, setTail] = useState('')
  const [code, setCode] = useState('')
  const [done, setDone] = useState(false)

  if (verified || done) {
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
      ) : !viaBot ? (
        requestId ? (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault()
              startTransition(async () => {
                setError(null)
                const r = await confirmPhoneCode(requestId, code)
                if (r.ok) setDone(true)
                else {
                  setError(r.error ?? 'Не получилось')
                  // Код сгорел — начинаем заново
                  if (!r.requestId) {
                    setRequestId(null)
                    setCode('')
                  }
                }
              })
            }}
          >
            <div className="rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-text-muted">
              Код отправлен в Telegram на номер, оканчивающийся на <b className="text-text">{tail}</b>.
              Он придёт от <b className="text-text">Verification Codes</b> — официального чата Telegram
              с синей галочкой.
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Код из Telegram"
              aria-label="Код из Telegram"
              autoFocus
              className="mt-3 w-full rounded-2xl bg-paper px-4 py-3 text-center text-lg tracking-[0.4em] text-text"
            />
            <button
              type="submit"
              disabled={pending || code.length < 4}
              className="press mt-3 w-full rounded-full bg-[#2aabee] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? 'Проверяем…' : 'Подтвердить'}
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null)
                  const r = await sendPhoneCode()
                  if (r.ok) setDone(true)
                  else if (r.requestId) {
                    setRequestId(r.requestId)
                    setTail(r.tail ?? '')
                  } else setError(r.error ?? 'Не получилось')
                })
              }
              className="press mt-4 w-full rounded-full bg-[#2aabee] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? 'Отправляем…' : 'Получить код в Telegram'}
            </button>
            <p className="mt-2 text-center text-xs text-text-muted">
              Код пришлёт сам Telegram, как это делают банки. Никому его не сообщайте
            </p>
          </>
        )
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
            Откроется наш бот <b className="text-text">Mebel</b>.
            {telegramConnected
              ? ' Внизу появится кнопка Telegram «Поделиться номером» — нажмите её, больше ничего делать не нужно.'
              : ' Нажмите «Start», а потом кнопку Telegram «Поделиться номером» — больше ничего делать не нужно.'}
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
              // Telegram ещё не подключён — выдаём ссылку привязки:
              // бот сам попросит номер сразу после «Start», одним разговором.
              const result = telegramConnected ? await phoneVerifyLink() : await connectTelegram()
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

      {hasPhone && gateway && (
        <button
          type="button"
          onClick={() => {
            setViaBot(!viaBot)
            setError(null)
          }}
          className="mt-3 w-full text-center text-sm text-text-muted underline underline-offset-4 hover:text-gold"
        >
          {viaBot ? 'Получить код в Telegram' : 'Код не приходит? Подтвердить через нашего бота'}
        </button>
      )}
    </div>
  )
}
