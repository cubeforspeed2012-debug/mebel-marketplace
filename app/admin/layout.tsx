import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { RoleSwitcher } from '@/components/role-switcher'
import { requireAdmin } from '@/lib/session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gold-deep">
            Управление площадкой
          </div>
          <h1 className="display mt-1 text-xl">{profile?.full_name ?? 'Администратор'}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <RoleSwitcher current="/admin" />
          <Link
            href="/"
            className="rounded-[var(--radius)] border border-line px-4 py-2 text-sm transition-colors hover:border-gold"
          >
            На сайт
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="border border-line px-4 py-2 text-sm text-text-muted transition-colors hover:border-gold hover:text-text"
            >
              Выйти
            </button>
          </form>
        </div>
      </div>

      {children}
    </div>
  )
}
