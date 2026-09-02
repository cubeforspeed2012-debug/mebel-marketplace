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

  // Уже вошёл — сразу в кабинет. Если база недоступна, показываем форму.
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
      ? 'Заявки мастерам и история обращений — в одном месте'
      : 'Работы, заявки и клиенты — в одном месте'

  return (
    <div
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-14"
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #1a2135 0%, #0d1220 55%, #090d18 100%)',
      }}
    >
      <div className="animate-page w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.35em] text-[#8b93a7]">
            Mebel · Ташкент
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">{heading}</h1>
          <p className="mt-2 text-sm text-[#8b93a7]">{subtitle}</p>
        </div>

        {error === 'link' && (
          <p className="mb-5 rounded-2xl bg-[#2a2418] px-4 py-3 text-center text-sm text-[#d8c08a]">
            Ссылка из письма просрочена или уже использована. Запросите новую.
          </p>
        )}

        <AuthForm next={next ?? (role === 'buyer' ? '/account' : '/dashboard')} role={role} />

        <p className="mt-7 text-center text-sm text-[#8b93a7]">
          {role === 'buyer' ? (
            <>
              Делаете мебель?{' '}
              <a href="/auth" className="text-[#c8a45c] hover:underline">
                Кабинет мастера
              </a>
            </>
          ) : (
            <>
              Ищете мебель?{' '}
              <a href="/auth?role=buyer" className="text-[#c8a45c] hover:underline">
                Кабинет покупателя
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
