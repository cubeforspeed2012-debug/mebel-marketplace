'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Отпечаток посетителя: адрес запроса, браузер и сегодняшняя дата.
 * Нужен, чтобы один человек за день посчитался один раз. Сам адрес никуда
 * не сохраняется — в базу уходит только необратимая свёртка, и завтра у того
 * же человека она будет уже другой.
 */
async function visitorTag(): Promise<string> {
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

/**
 * Отдаёт телефон мастера по нажатию «Показать номер» и засчитывает просмотр.
 * Номер специально не приезжает вместе со страницей: иначе базу номеров всех
 * мебельщиков можно выкачать одним запросом.
 */
export async function revealPhone(
  companyId: number,
  productId?: number | null,
): Promise<{ phone: string | null }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('reveal_phone', {
      p_company_id: companyId,
      p_visitor: await visitorTag(),
      p_product_id: productId ?? null,
    })

    if (error) return { phone: null }
    return { phone: (data as string | null) ?? null }
  } catch {
    // Номер не достали — покажем это кнопкой, страницу ломать незачем.
    return { phone: null }
  }
}
