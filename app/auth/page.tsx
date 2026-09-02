import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthForm } from './auth-form'

export const metadata = {
  title: 'Вход для мастеров',
  description: 'Кабинет мебельщика: каталог работ, заявки от клиентов, продвижение.',
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

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

  return (
    <div className="bg-ink py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="display text-2xl text-on-dark">Кабинет мастера</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-dark-muted">
            Разместите работы, принимайте заявки и ведите клиентов — в одном месте.
          </p>
        </div>

        <AuthForm next={next ?? '/dashboard'} />
      </div>
    </div>
  )
}
