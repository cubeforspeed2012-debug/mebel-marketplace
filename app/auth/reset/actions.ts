'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type ResetState = { error?: string; message?: string }

/** Отправляет письмо со ссылкой для смены пароля. */
export async function requestReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email.includes('@')) return { error: 'Укажите почту' }

  try {
    const headerList = await headers()
    const host = headerList.get('host')
    const protocol = host?.startsWith('localhost') ? 'http' : 'https'

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${protocol}://${host}/auth/callback?next=/auth/new-password`,
    })

    if (error) return { error: 'Не удалось отправить письмо. Попробуйте позже' }
  } catch {
    return { error: 'Сервер не отвечает. Попробуйте ещё раз через минуту' }
  }

  // Не говорим, есть такая почта или нет — иначе можно подбирать чужие аккаунты.
  return {
    message:
      'Если такая почта у нас есть, письмо со ссылкой уже отправлено. Проверьте почту и папку «Спам»',
  }
}

/** Устанавливает новый пароль. Работает после перехода по ссылке из письма. */
export async function setNewPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = String(formData.get('password') ?? '')
  const repeat = String(formData.get('repeat') ?? '')

  if (password.length < 6) return { error: 'Пароль слишком короткий — минимум 6 символов' }
  if (password !== repeat) return { error: 'Пароли не совпадают' }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Ссылка просрочена. Запросите новую на странице восстановления' }
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: 'Не удалось сменить пароль. Попробуйте ещё раз' }
  } catch {
    return { error: 'Сервер не отвечает. Попробуйте ещё раз через минуту' }
  }

  return { message: 'Пароль изменён. Теперь входите с новым паролем' }
}
