import { createClient } from '@/lib/supabase/server'
import { visitorTag } from '@/lib/visitor'

/**
 * Считает посещение: общий счётчик площадки и просмотры конкретной
 * страницы мастера или товара.
 *
 * Один человек за день засчитывается один раз — иначе цифру накручивает
 * любой, кто держит F5. Мастер платит за продвижение и смотрит в эти числа,
 * поэтому они должны быть честными.
 *
 * Счётчик никогда не должен ломать страницу — поэтому все ошибки глотаем.
 */
export async function bumpViews(kind: 'site' | 'company' | 'product', id?: number) {
  try {
    const supabase = await createClient()
    await supabase.rpc('bump_views', {
      p_kind: kind,
      p_id: id ?? null,
      p_visitor: await visitorTag(),
    })
  } catch {
    // Счётчик недоступен — не беда, страница важнее.
  }
}
