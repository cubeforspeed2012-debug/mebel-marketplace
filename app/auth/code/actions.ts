'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type CodeState = { error?: string; sent?: boolean; email?: string }

/** Шаг 1: отправляем код на почту. */
export async function sendCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get('email') ?? '').trim()
  const role = formData.get('role') === 'buyer' ? 'buyer' : 'seller'

  if (!email.includes('@')) return { error: 'Укажите почту' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { role } },
    })

    if (error) {
      return {
        error: /rate|limit|seconds/i.test(error.message)
          ? 'Код уже отправлен. Подождите минуту и попробуйте снова'
          : 'Не удалось отправить код. Попробуйте войти по паролю',
        email,
      }
    }
  } catch {
    return { error: 'Сервер не отвечает. Попробуйте ещё раз', email }
  }

  return { sent: true, email }
}

/** Шаг 2: проверяем код из письма. */
export async function verifyCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get('email') ?? '').trim()
  const token = String(formData.get('code') ?? '').replace(/\D/g, '')

  if (token.length < 4) return { error: 'Введите код полностью', sent: true, email }

  let destination = '/dashboard'

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

    if (error) {
      return {
        error: /expired/i.test(error.message)
          ? 'Код просрочен — запросите новый'
          : 'Код неверный. Проверьте цифры из письма',
        sent: true,
        email,
      }
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.role === 'admin') destination = '/admin'
      else if (profile?.role === 'buyer') destination = '/account'
    }
  } catch {
    return { error: 'Сервер не отвечает. Попробуйте ещё раз', sent: true, email }
  }

  revalidatePath('/', 'layout')
  redirect(destination)
}
