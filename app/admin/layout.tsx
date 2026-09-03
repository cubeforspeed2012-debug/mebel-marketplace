import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { requireAdmin } from '@/lib/session'
import { AdminRail } from './admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin()

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-3 sm:p-5">
      <div className="mx-auto flex max-w-[1400px] gap-4">
        <AdminRail />

        <div className="min-w-0 flex-1 rounded-3xl bg-[#171717] p-5 sm:p-7">
          {/* Верхняя строка: дата, выход, профиль */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-[#8f8f8f]">Сегодня, {today}</div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="press rounded-full bg-[#232323] px-4 py-2 text-sm text-[#d6d6d6] transition-colors hover:bg-[#2c2c2c]"
              >
                На сайт
              </Link>
              <Link
                href="/dashboard"
                className="press rounded-full bg-[#232323] px-4 py-2 text-sm text-[#d6d6d6] transition-colors hover:bg-[#2c2c2c]"
              >
                Кабинет мастера
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="press rounded-full bg-[#232323] px-4 py-2 text-sm text-[#8f8f8f] transition-colors hover:bg-[#2c2c2c] hover:text-white"
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
