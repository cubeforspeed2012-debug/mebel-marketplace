'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ReviewState = { error?: string; message?: string }

/**
 * Отзыв о мастере. Один человек — один отзыв на мастерскую: повторная
 * отправка обновляет прежний, а не плодит новые. Свою мастерскую
 * оценить нельзя — это запрещает сама база.
 */
export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const companyId = Number(formData.get('company_id'))
  const rating = Number(formData.get('rating'))
  const text = String(formData.get('text') ?? '').trim()

  if (!companyId) return { error: 'Мастер не найден' }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Поставьте оценку' }
  if (text.length > 1000) return { error: 'Слишком длинный отзыв' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Войдите, чтобы оставить отзыв' }

  // Имя подписи берём из профиля один раз — чужие профили никому не видны
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const { error } = await supabase.from('reviews').upsert(
    {
      company_id: companyId,
      user_id: user.id,
      rating,
      text: text || null,
      author_name: profile?.full_name?.trim() || 'Покупатель',
    },
    { onConflict: 'company_id,user_id' },
  )

  if (error) {
    if (/row-level security/i.test(error.message)) {
      return { error: 'Свою мастерскую оценить нельзя' }
    }
    return { error: 'Не удалось сохранить отзыв. Попробуйте ещё раз' }
  }

  revalidatePath('/company/[slug]', 'page')
  revalidatePath('/catalog')
  return { message: 'Спасибо! Отзыв опубликован' }
}
