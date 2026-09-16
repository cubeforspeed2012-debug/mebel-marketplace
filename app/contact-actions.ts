'use server'

import { createClient } from '@/lib/supabase/server'
import { visitorTag } from '@/lib/visitor'

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
