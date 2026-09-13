import { createClient } from '@/lib/supabase/server'

/**
 * Какие товары человек уже отметил сердечком. Одним запросом на страницу,
 * чтобы карточки сразу рисовались в правильном виде, без мигания.
 */
export async function getFavoriteIds(): Promise<Set<number>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return new Set()

    const { data } = await supabase.from('favorites').select('product_id').eq('user_id', user.id)

    return new Set((data ?? []).map((row) => row.product_id as number))
  } catch {
    return new Set()
  }
}
