import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { AUTH_COOKIE_OPTIONS } from './cookies'

/**
 * Supabase на сервере — каталог рендерится на сервере, чтобы страницы
 * попадали в поиск Google. Это главный источник бесплатного трафика.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...AUTH_COOKIE_OPTIONS, ...options }),
            )
          } catch {
            // Вызов из Server Component — куки обновит middleware.
          }
        },
      },
    },
  )
}

/**
 * Кто сейчас на сайте.
 *
 * Спрашивать это напрямую нельзя: getUser() каждый раз ходит по сети
 * к Supabase, а страницу собирают сразу несколько частей — подвал, меню,
 * сама страница. Выходило под тридцать одинаковых вопросов на один показ
 * страницы. Supabase на бесплатном тарифе такой напор ограничивает и
 * перестаёт отвечать — а молчание выглядело как «этот человек не входил»,
 * и сайт выкидывал вошедшего на регистрацию.
 *
 * cache() держит ответ до конца запроса: сколько бы частей ни спросило,
 * по сети уходит один вопрос.
 *
 * Отдельно различаем два «нет»: человек правда не входил — и Supabase
 * не ответил. Во втором случае выгонять нельзя: вход в порядке, просто
 * сервер сейчас занят.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (data.user) return { user: data.user, authUnavailable: false }

  // Куки входа лежат в браузере, а ответа нет — значит дело не в человеке.
  const store = await cookies()
  const hasSessionCookie = store
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token') && !c.name.includes('code-verifier'))

  // 401/403 — токен правда недействителен, это честный выход.
  const status = (error as { status?: number } | null)?.status
  const tokenRejected = status === 401 || status === 403

  return {
    user: null,
    authUnavailable: Boolean(error) && hasSessionCookie && !tokenRejected,
  }
})

/**
 * То же самое, но коротко — там, где разницу между «не входил»
 * и «сервер молчит» разбирать незачем.
 */
export async function currentUser() {
  const { user } = await getCurrentUser()
  return user
}
