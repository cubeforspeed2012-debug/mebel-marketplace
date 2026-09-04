import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE_OPTIONS } from './cookies'

/** Страницы, куда пускаем только после входа. */
const PROTECTED = ['/dashboard', '/admin', '/account']

/**
 * Продлевает сессию на каждом запросе и закрывает кабинет от неавторизованных.
 * Без этого вход «слетал» бы через час.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Ключей нет — не роняем весь сайт. Каталог покажется, кабинет попросит войти.
  if (!url || !key) {
    const path = request.nextUrl.pathname
    if (PROTECTED.some((prefix) => path.startsWith(prefix))) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth'
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...AUTH_COOKIE_OPTIONS, ...options }),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const needsAuth = PROTECTED.some((prefix) => path.startsWith(prefix))

  if (needsAuth && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  return response
}
