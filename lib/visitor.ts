import { headers } from 'next/headers'

/**
 * Отпечаток посетителя: адрес запроса, браузер и сегодняшняя дата.
 * По нему один человек за день считается один раз — и в просмотрах страниц,
 * и в нажатиях «Показать номер».
 *
 * Сам адрес никуда не сохраняется: в базу уходит только необратимая свёртка,
 * и завтра у того же человека она будет уже другой.
 */
export async function visitorTag(): Promise<string> {
  const head = await headers()
  const ip =
    head.get('cf-connecting-ip') ??
    head.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'неизвестно'
  const agent = head.get('user-agent') ?? 'неизвестно'
  const day = new Date().toISOString().slice(0, 10)

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${ip}|${agent}|${day}`),
  )

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
