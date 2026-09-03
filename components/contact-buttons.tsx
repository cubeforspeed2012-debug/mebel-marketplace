import {
  formatPhone,
  instagramHref,
  telHref,
  telegramHref,
  whatsappHref,
} from '@/lib/constants'

/* Значки мессенджеров рисуем сами: чужие библиотеки ради двух иконок не тянем */

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.86 9.86 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.81.83-3.03-.2-.31a8.18 8.18 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.23-8.23a8.18 8.18 0 0 1 8.22 8.24c0 4.54-3.69 8.21-8.23 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.06-.25-.12-1.05-.38-1.99-1.23-.74-.65-1.23-1.46-1.38-1.71-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.9 2.4 1.02 2.56c.12.17 1.75 2.67 4.25 3.74.59.26 1.05.41 1.41.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  )
}

function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M21.94 4.6 18.9 19.02c-.23 1.01-.83 1.26-1.68.79l-4.64-3.42-2.24 2.16c-.25.25-.46.46-.94.46l.33-4.73 8.6-7.77c.37-.33-.08-.52-.58-.19l-10.63 6.7-4.58-1.43c-1-.31-1.01-1 .21-1.48l17.9-6.9c.83-.3 1.56.2 1.29 1.39Z" />
    </svg>
  )
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8}
         aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function PhoneMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
    </svg>
  )
}

/**
 * Как связаться с мастером. Звонок — главное действие, но в Ташкенте
 * половина людей скорее напишет, чем позвонит незнакомому человеку,
 * поэтому мессенджеры стоят рядом, а не спрятаны внизу страницы.
 */
export function ContactButtons({
  phone,
  telegram,
  instagram,
  size = 'large',
}: {
  phone: string | null
  telegram?: string | null
  instagram?: string | null
  size?: 'large' | 'small'
}) {
  const wa = whatsappHref(phone)
  const tg = telegramHref(telegram ?? null)
  const ig = instagramHref(instagram ?? null)

  const big = size === 'large'
  const base = big ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'

  return (
    <div className="flex flex-wrap gap-3">
      {phone && (
        <a
          href={telHref(phone)}
          className={`press inline-flex items-center gap-2 rounded-full bg-gold font-semibold text-white transition-colors hover:bg-gold-deep ${base}`}
        >
          <PhoneMark />
          {big ? `Позвонить ${formatPhone(phone)}` : 'Позвонить'}
        </a>
      )}

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className={`press inline-flex items-center gap-2 rounded-full border border-line font-semibold text-[#4bc45f] transition-colors hover:border-[#4bc45f] ${base}`}
        >
          <WhatsAppMark />
          WhatsApp
        </a>
      )}

      {tg && (
        <a
          href={tg}
          target="_blank"
          rel="noopener noreferrer"
          className={`press inline-flex items-center gap-2 rounded-full border border-line font-semibold text-[#4aa8e0] transition-colors hover:border-[#4aa8e0] ${base}`}
        >
          <TelegramMark />
          Telegram
        </a>
      )}

      {ig && (
        <a
          href={ig}
          target="_blank"
          rel="noopener noreferrer"
          className={`press inline-flex items-center gap-2 rounded-full border border-line font-semibold text-[#d8709a] transition-colors hover:border-[#d8709a] ${base}`}
        >
          <InstagramMark />
          Instagram
        </a>
      )}
    </div>
  )
}
