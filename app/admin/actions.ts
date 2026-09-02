'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/session'

/** Одобрить, заблокировать или вернуть мастерскую на проверку. */
export async function setCompanyStatus(formData: FormData) {
  const { supabase } = await requireAdmin()

  const id = Number(formData.get('id'))
  const status = String(formData.get('status') ?? '')
  const note = String(formData.get('note') ?? '').trim() || null

  if (!id || !['pending', 'active', 'blocked'].includes(status)) return

  await supabase
    .from('companies')
    .update({ status, moderation_note: note, updated_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/admin')
  revalidatePath('/catalog')
  revalidatePath('/companies')
}

/** Подтвердить оплату продвижения — пока вручную, до подключения Payme и Click. */
export async function confirmPromotion(formData: FormData) {
  const { supabase } = await requireAdmin()

  const id = Number(formData.get('id'))
  if (!id) return

  const { data: promo } = await supabase
    .from('promotions')
    .select('id, company_id, product_id, hours')
    .eq('id', id)
    .maybeSingle()

  if (!promo) return

  const startsAt = new Date()
  const endsAt = new Date(startsAt.getTime() + promo.hours * 60 * 60 * 1000)

  await supabase
    .from('promotions')
    .update({
      status: 'active',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq('id', id)

  // Поднимаем в каталоге: либо конкретный товар, либо всю мастерскую
  if (promo.product_id) {
    await supabase
      .from('products')
      .update({ boosted_until: endsAt.toISOString() })
      .eq('id', promo.product_id)
  } else {
    await supabase
      .from('companies')
      .update({ boosted_until: endsAt.toISOString() })
      .eq('id', promo.company_id)
  }

  revalidatePath('/admin')
  revalidatePath('/catalog')
}
