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
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Через Google имя приходит из аккаунта Google, а телефона нет.
        // Пока человек не представился сам — ведём его знакомиться.
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarded')
            .eq('id', data.user.id)
            .maybeSingle()

          if (profile && !profile.onboarded) {
            return NextResponse.redirect(
              `${origin}/welcome?next=${encodeURIComponent(next)}`,
            )
          }
        }

        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch {
      // Ссылка просрочена или уже использована — покажем вход с подсказкой.
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=link`)
}
