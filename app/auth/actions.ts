'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
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
  let destination = next

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      failure = readableError(error.message)
    } else if (data.user && next === '/dashboard') {
      // Вход один для всех, а дальше каждого ведём в его кабинет:
      // администратора — в управление площадкой, покупателя — к заявкам.
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.role === 'admin') destination = '/admin'
      else if (profile?.role === 'buyer') destination = '/account'
      else {
        // Мастер, который так и не завёл мастерскую, — сразу в форму:
        // кабинет без мастерской пустой и только сбивает с толку.
        const { data: own } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_user_id', data.user.id)
          .limit(1)
        if (!own?.length) destination = '/profile/company'
      }
    }
  } catch (e) {
    failure = readableError(e instanceof Error ? e.message : 'network')
  }

  if (failure) return { error: failure }

  revalidatePath('/', 'layout')
  redirect(destination)
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
  // Мастера ведём сразу в форму мастерской — без неё в каталоге его нет,
  // а страница профиля между регистрацией и формой только теряет людей.
  // Покупателя — в каталог.
  redirect(role === 'buyer' ? '/catalog' : '/profile/company')
}

export async function signOut() {
  const supabase = await createClient()

  // Supabase стирает куки входа только если его сервер ответил «ок».
  // Не ответил (занят, оборвалась сеть) — куки остаются, и человек,
  // нажавший «Выйти», при следующем же клике оказывается снова внутри.
  // Ровно это и происходило. Поэтому куки вычищаем сами, независимо
  // от того, что ответил Supabase: выход — это решение человека,
  // а не сервера.
  try {
    await supabase.auth.signOut()
  } catch {
    // ниже всё равно вычистим
  }

  const store = await cookies()
  for (const cookie of store.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      store.set(cookie.name, '', { path: '/', maxAge: 0 })
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
