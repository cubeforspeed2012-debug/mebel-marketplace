import Link from 'next/link'
import { Suspense } from 'react'
import { signOut } from '@/app/auth/actions'
import { requireAdmin } from '@/lib/session'
import { AdminRail } from './admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireAdmin()

  // Сколько мастерских ждут решения — цифра нужна и в ленте, и на телефоне
  const { count } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  const pending = count ?? 0

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-cream p-3 sm:p-5">
      <div className="mx-auto flex max-w-[1400px] gap-4">
        <Suspense fallback={<div className="hidden w-[68px] shrink-0 rounded-3xl bg-paper lg:block" />}>
          <AdminRail pending={pending} />
        </Suspense>

        <div className="min-w-0 flex-1 rounded-3xl bg-paper p-5 sm:p-7">
          {/* Верхняя строка: дата, выход, профиль */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-text-muted">Сегодня, {today}</div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="press rounded-full bg-sand px-4 py-2 text-sm text-text transition-colors hover:bg-gold-soft"
              >
                На сайт
              </Link>
              <Link
                href="/dashboard"
                className="press rounded-full bg-sand px-4 py-2 text-sm text-text transition-colors hover:bg-gold-soft"
              >
                Кабинет мастера
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="press rounded-full bg-sand px-4 py-2 text-sm text-text-muted transition-colors hover:bg-gold-soft hover:text-text"
                >
                  Выйти
                </button>
              </form>
              <span className="flex size-10 items-center justify-center rounded-full bg-gold text-sm font-semibold text-white">
                {(profile?.full_name ?? 'A').charAt(0)}
              </span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
