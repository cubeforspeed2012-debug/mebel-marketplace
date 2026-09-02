import { createClient } from '@/lib/supabase/server'

/**
 * Считает посещение: общий счётчик площадки и просмотры конкретной
 * страницы мастера или товара. Нужно для статистики в админке.
 *
 * Счётчик никогда не должен ломать страницу — поэтому все ошибки глотаем.
 */
export async function bumpViews(kind: 'site' | 'company' | 'product', id?: number) {
  try {
    const supabase = await createClient()
    await supabase.rpc('bump_views', { p_kind: kind, p_id: id ?? null })
  } catch {
    // Счётчик недоступен — не беда, страница важнее.
  }
}
