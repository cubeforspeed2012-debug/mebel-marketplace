'use server'

import { revalidatePath } from 'next/cache'
import { getSellerContext } from '@/lib/session'

export type PortfolioState = { error?: string; message?: string }

const MAX_PHOTOS = 12

/**
 * Портфолио мастера — просто фотографии сделанных работ, без цены и заказа.
 * Люди сначала смотрят, что человек умеет, и только потом читают карточки.
 */
export async function addPortfolioPhotos(
  _prev: PortfolioState,
  formData: FormData,
): Promise<PortfolioState> {
  const { supabase, user, company } = await getSellerContext()
  if (!company) return { error: 'Сначала заполните мастерскую' }

  const { count } = await supabase
    .from('portfolio_photos')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company.id)

  const already = count ?? 0
  const room = MAX_PHOTOS - already
  if (room <= 0) return { error: `В портфолио уже ${MAX_PHOTOS} фото — удалите лишние` }

  const files = formData
    .getAll('photos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  if (files.length === 0) return { error: 'Выберите фотографии' }

  const rows: { company_id: number; url: string; sort_order: number }[] = []

  for (const [index, file] of files.slice(0, room).entries()) {
    if (file.size > 5 * 1024 * 1024) {
      return { error: `Фото «${file.name}» больше 5 МБ — выберите полегче` }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/portfolio/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('company-media')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })

    if (uploadError) {
      return { error: `Не удалось загрузить «${file.name}»: ${uploadError.message}` }
    }

    rows.push({
      company_id: company.id,
      url: supabase.storage.from('company-media').getPublicUrl(path).data.publicUrl,
      sort_order: already + index,
    })
  }

  const { error } = await supabase.from('portfolio_photos').insert(rows)
  if (error) return { error: `Фото загрузились, но не записались: ${error.message}` }

  revalidatePath('/dashboard/products')
  revalidatePath(`/company/${company.slug ?? company.id}`)

  return { message: `Добавлено фото: ${rows.length}` }
}

/** Убрать фотографию из портфолио. */
export async function removePortfolioPhoto(formData: FormData) {
  const { supabase, company } = await getSellerContext()
  if (!company) return

  const id = Number(formData.get('id'))
  if (!id) return

  await supabase.from('portfolio_photos').delete().eq('id', id).eq('company_id', company.id)

  revalidatePath('/dashboard/products')
  revalidatePath(`/company/${company.slug ?? company.id}`)
}
