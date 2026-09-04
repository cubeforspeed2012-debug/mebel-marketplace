import { formatPhone, instagramHref, telHref, telegramHref } from '@/lib/constants'

/* Значки мессенджеров рисуем сами: чужие библиотеки ради двух иконок не тянем */

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
