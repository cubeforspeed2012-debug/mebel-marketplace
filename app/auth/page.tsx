import { redirect } from 'next/navigation'
import { getDictionary } from '@/lib/locale'
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
  const dict = await getDictionary()
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

  const heading = role === 'buyer' ? dict.auth.buyerTitle : dict.auth.sellerTitle
  const subtitle = role === 'buyer' ? dict.auth.buyerSubtitle : dict.auth.sellerSubtitle

  return (
    <div
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-14"
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #242424 0%, #181818 45%, #101010 100%)',
      }}
    >
      <div className="animate-page w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.35em] text-text-muted">
            {dict.auth.brand}
          </div>
          <h1 className="mt-4 display text-2xl text-text">{heading}</h1>
          <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
        </div>

        {error === 'link' && (
          <p className="mb-5 rounded-2xl border border-gold bg-gold-soft px-4 py-3 text-center text-sm text-text">
            {dict.auth.linkExpired}
          </p>
        )}

        <AuthForm next={next ?? (role === 'buyer' ? '/account' : '/dashboard')} role={role} />

        <p className="mt-7 text-center text-sm text-text-muted">
          {role === 'buyer' ? (
            <>
              {dict.auth.orSeller}{' '}
              <a href="/auth" className="text-gold hover:underline">
                {dict.auth.orSellerLink}
              </a>
            </>
          ) : (
            <>
              {dict.auth.orBuyer}{' '}
              <a href="/auth?role=buyer" className="text-gold hover:underline">
                {dict.auth.orBuyerLink}
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
