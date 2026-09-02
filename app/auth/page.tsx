import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthForm } from './auth-form'

export const metadata = {
  title: 'Вход и регистрация',
  description: 'Кабинет мебельщика и личный кабинет покупателя на площадке Mebel.',
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string; error?: string }>
}) {
  const { next, role: roleParam, error } = await searchParams
  const role = roleParam === 'buyer' ? 'buyer' : 'seller'

  // Уже вошёл — сразу в кабинет. Если база недоступна, показываем форму:
  // страница входа должна открываться всегда.
  let signedIn = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    signedIn = Boolean(user)
  } catch {
    signedIn = false
  }

  if (signedIn) redirect(next ?? '/dashboard')

  const heading = role === 'buyer' ? 'Личный кабинет' : 'Кабинет мастера'
  const subtitle =
    role === 'buyer'
      ? 'Заявки мастерам, история обращений и избранная мебель — в одном месте.'
      : 'Разместите работы, принимайте заявки и ведите клиентов — в одном месте.'

  return (
    <div className="bg-ink py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="display text-2xl text-on-dark">{heading}</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-dark-muted">{subtitle}</p>
        </div>

        {error === 'link' && (
          <p className="mb-5 border border-gold bg-gold/10 px-4 py-3 text-sm text-on-dark">
            Ссылка из письма просрочена или уже использована. Запросите новую.
          </p>
        )}

        <AuthForm next={next ?? (role === 'buyer' ? '/account' : '/dashboard')} role={role} />

        <p className="mt-6 text-center text-sm text-on-dark-muted">
          {role === 'buyer' ? (
            <>
              Делаете мебель?{' '}
              <a href="/auth" className="text-gold hover:underline">
                Кабинет мастера
              </a>
            </>
          ) : (
            <>
              Ищете мебель?{' '}
              <a href="/auth?role=buyer" className="text-gold hover:underline">
                Кабинет покупателя
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
