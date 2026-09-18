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

  // Браузер заранее подтягивает соседние разделы, чтобы переход был
  // мгновенным: один клик по меню — и вперёд уезжает под полтора десятка
  // страниц. Продлевать сессию на каждой такой заготовке незачем — это
  // десятки лишних вопросов к Supabase на один переход, и на бесплатном
  // тарифе он от такого напора замолкает. Сессию продлит настоящий переход.
  if (request.headers.get('next-router-prefetch') === '1') return response

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

  const { data, error } = await supabase.auth.getUser()
  const user = data.user

  const path = request.nextUrl.pathname
  const needsAuth = PROTECTED.some((prefix) => path.startsWith(prefix))

  if (needsAuth && !user) {
    // Supabase молчит (занят, оборвалась сеть), а куки входа на месте —
    // человек вошёл, просто ответа сейчас нет. Выгонять его на регистрацию
    // нельзя: он решит, что аккаунт пропал, и уйдёт навсегда.
    // 401 и 403 — другое дело: тут токен правда недействителен.
    const status = (error as { status?: number } | null)?.status
    const tokenRejected = status === 401 || status === 403
    const hasSessionCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token') && !c.name.includes('code-verifier'))

    if (!(error && hasSessionCookie && !tokenRejected)) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }
  }

  return response
}
