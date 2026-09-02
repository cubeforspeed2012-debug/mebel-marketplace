import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Сюда возвращает ссылка из письма (подтверждение почты или сброс пароля).
 * Меняем одноразовый код на сессию и ведём человека дальше.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) return NextResponse.redirect(`${origin}${next}`)
    } catch {
      // Ссылка просрочена или уже использована — покажем вход с подсказкой.
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=link`)
}
