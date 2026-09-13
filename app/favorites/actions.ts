'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Сердечко на карточке. Гостя ведём на вход — иначе список любимого
 * некуда сохранять, он живёт в аккаунте и виден с любого устройства.
 */
export async function toggleFavorite(formData: FormData) {
  const productId = Number(formData.get('product_id'))
  const next = String(formData.get('next') ?? '/catalog')
  if (!productId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/auth?role=buyer&next=${encodeURIComponent(next)}`)

  const { data: existing } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId)
  } else {
    await supabase.from('favorites').insert({ user_id: user.id, product_id: productId })
  }

  revalidatePath('/favorites')
  revalidatePath(next)
}
