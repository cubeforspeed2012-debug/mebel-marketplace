import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
