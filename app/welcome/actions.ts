'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { normalizePhone } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export type WelcomeState = { error?: string }

/**
 * Знакомство после входа через Google. Имя из аккаунта Google — это имя
 * почтового ящика, а не то, как человек хочет представляться другим.
 * Поэтому спрашиваем его сами и только после этого пускаем в кабинет.
 */
export async function completeProfile(
  _prev: WelcomeState,
  formData: FormData,
): Promise<WelcomeState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phoneRaw = String(formData.get('phone') ?? '').trim()
  const role = formData.get('role') === 'seller' ? 'seller' : 'buyer'

  if (fullName.length < 2) return { error: 'Напишите, как вас зовут' }
  if (fullName.length > 60) return { error: 'Имя слишком длинное — до 60 символов' }

  const phone = normalizePhone(phoneRaw)
  if (!phone) return { error: 'Телефон в формате +998 90 123 45 67' }

  let failure: string | null = null

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/auth')

    // Роль администратора не трогаем: он и так universal, ему кабинеты доступны все.
    const { data: current } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const nextRole = current?.role === 'admin' ? 'admin' : role

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, role: nextRole, onboarded: true })
      .eq('id', user.id)

    if (error) failure = 'Не удалось сохранить. Попробуйте ещё раз'
  } catch {
    failure = 'Сервер не отвечает. Попробуйте ещё раз через минуту'
  }

  if (failure) return { error: failure }

  revalidatePath('/', 'layout')
  redirect(role === 'seller' ? '/dashboard/company' : '/catalog')
}
