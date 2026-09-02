'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; message?: string }

/** Переводит ошибки Supabase на человеческий язык. */
function readableError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Неверная почта или пароль',
    'User already registered': 'Такая почта уже зарегистрирована — войдите',
    'Email not confirmed': 'Подтвердите почту — письмо уже отправлено',
    'Password should be at least 6 characters':
      'Пароль слишком короткий — минимум 6 символов',
  }
  if (map[message]) return map[message]

  // Сеть отвалилась или база спит — техническую ошибку пользователю не показываем.
  if (/fetch|network|JSON|timeout|ECONN/i.test(message)) {
    return 'Сервер не отвечает. Попробуйте ещё раз через минуту'
  }

  return message
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/dashboard')

  if (!email || !password) return { error: 'Заполните почту и пароль' }

  // Сетевые сбои ловим здесь: redirect ниже бросает своё исключение,
  // и оно не должно попасть в этот catch.
  let failure: string | null = null
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) failure = readableError(error.message)
  } catch (e) {
    failure = readableError(e instanceof Error ? e.message : 'network')
  }

  if (failure) return { error: failure }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  // Кто регистрируется: мастер (ведёт мастерскую) или покупатель (ищет мебель).
  const role = formData.get('role') === 'buyer' ? 'buyer' : 'seller'

  if (!fullName) return { error: 'Укажите имя' }
  if (!phone) {
    return {
      error:
        role === 'buyer'
          ? 'Укажите телефон — по нему мастер свяжется с вами'
          : 'Укажите телефон — по нему с вами свяжутся клиенты',
    }
  }
  if (password.length < 6) return { error: 'Пароль слишком короткий — минимум 6 символов' }

  let failure: string | null = null
  let hasSession = false

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, role } },
    })
    if (error) failure = readableError(error.message)
    hasSession = Boolean(data?.session)
  } catch (e) {
    failure = readableError(e instanceof Error ? e.message : 'network')
  }

  if (failure) return { error: failure }

  // Если Supabase требует подтверждения почты, сессии ещё нет.
  if (!hasSession) {
    return { message: 'Мы отправили письмо на почту — подтвердите её и войдите' }
  }

  revalidatePath('/', 'layout')
  // Мастера ведём заполнять мастерскую, покупателя — сразу в каталог.
  redirect(role === 'buyer' ? '/catalog' : '/dashboard/company')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
