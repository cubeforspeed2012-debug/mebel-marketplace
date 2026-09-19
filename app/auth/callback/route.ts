import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Сюда возвращает вход через Google и ссылки из писем.
 * Меняем одноразовый код на сессию и ведём человека дальше.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Внутри Telegram правила другие: туда пускаем только тех, у кого
  // мастерская уже есть, и никуда из окошка не уводим.
  const fromMiniApp = next.startsWith('/tg')

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        if (data.user && fromMiniApp) {
          // Мини-приложение — витрина цифр для мастера. Если человек вошёл
          // не тем аккаунтом Google (а промахнуться легко: на телефоне их
          // часто несколько), мастерской за этой почтой нет. Пускать его
          // в пустой кабинет нельзя — он решит, что мастерская пропала.
          // Честнее сразу сказать, что такого аккаунта у нас нет.
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('owner_user_id', data.user.id)
            .maybeSingle()

          if (!company) {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/tg?error=no-account`)
          }

          return NextResponse.redirect(`${origin}${next}`)
        }

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

  // Внутри Telegram страница входа своя: на большой сайт не выкидываем
  return NextResponse.redirect(
    fromMiniApp ? `${origin}/tg?error=no-account` : `${origin}/auth?error=link`,
  )
}
