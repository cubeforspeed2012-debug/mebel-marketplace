import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WelcomeForm } from './welcome-form'

export const metadata = { title: 'Знакомимся' }

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, onboarded')
    .eq('id', user.id)
    .maybeSingle()

  // Уже знакомились — второй раз не спрашиваем
  if (profile?.onboarded) redirect(profile.role === 'seller' ? '/dashboard' : '/account')

  // Имя из аккаунта Google подставляем как подсказку — его можно стереть и написать своё
  const suggested =
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    ''

  const role = next?.startsWith('/dashboard') || profile?.role === 'seller' ? 'seller' : 'buyer'

  return (
    <div
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-14"
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #fffdf9 0%, #f7f2ea 45%, #efe6d8 100%)',
      }}
    >
      <div className="animate-page w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.35em] text-text-muted">
            Mebel · Ташкент
          </div>
          <h1 className="display mt-4 text-2xl text-ink">Давайте познакомимся</h1>
          <p className="mt-2 text-sm text-text-muted">
            Осталось два поля — и кабинет ваш
          </p>
        </div>

        <WelcomeForm suggestedName={suggested} role={role} />

        <p className="mt-7 text-center text-xs leading-relaxed text-text-muted">
          Имя и телефон можно поменять в кабинете в любой момент.
        </p>
      </div>
    </div>
  )
}
