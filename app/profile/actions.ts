'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { normalizePhone } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export type ProfileState = { error?: string; message?: string }

/** Имя и телефон человека. Роль отсюда не меняется — за неё отвечает база. */
export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phoneRaw = String(formData.get('phone') ?? '').trim()

  if (fullName.length < 2) return { error: 'Напишите, как вас зовут' }
  if (fullName.length > 60) return { error: 'Имя слишком длинное — до 60 символов' }

  const phone = phoneRaw ? normalizePhone(phoneRaw) : null
  if (phoneRaw && !phone) return { error: 'Телефон в формате +998 90 123 45 67' }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/auth')

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, onboarded: true })
      .eq('id', user.id)

    if (error) return { error: 'Не удалось сохранить. Попробуйте ещё раз' }
  } catch {
    return { error: 'Сервер не отвечает. Попробуйте ещё раз через минуту' }
  }

  revalidatePath('/', 'layout')
  return { message: 'Сохранено' }
}
