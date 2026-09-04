import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './profile-form'

export const metadata = { title: 'Мой профиль' }

const ROLE_LABEL: Record<string, string> = {
  admin: 'Администратор площадки',
  seller: 'Мастер',
  buyer: 'Покупатель',
}

/** Профиль человека — один для всех: и мастера, и покупателя, и администратора. */
export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, role')
    .eq('id', user.id)
    .maybeSingle()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, status')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'buyer'

  const links = [
    role === 'admin' && { href: '/admin', label: 'Панель управления', hint: 'Вся площадка' },
    (role === 'seller' || role === 'admin') && {
      href: '/dashboard',
      label: 'Кабинет мастера',
      hint: 'Заявки, клиенты, мебель',
    },
    { href: '/account', label: 'Мои заявки', hint: 'Что я заказывал у мастеров' },
    { href: '/catalog', label: 'Каталог мебели', hint: 'Найти мебель' },
    { href: '/auth/new-password', label: 'Сменить пароль', hint: 'Безопасность входа' },
  ].filter(Boolean) as { href: string; label: string; hint: string }[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold text-xl font-semibold text-white">
          {(profile?.full_name ?? user.email ?? 'М').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="display truncate text-xl text-text">
            {profile?.full_name ?? 'Без имени'}
          </h1>
          <div className="mt-0.5 truncate text-sm text-text-muted">
            {ROLE_LABEL[role]} · {user.email}
          </div>
        </div>
      </div>

      <ProfileForm fullName={profile?.full_name ?? ''} phone={profile?.phone ?? ''} />

      {company && (
        <div className="mt-4 rounded-3xl bg-paper p-6">
          <div className="text-sm text-text-muted">Моя мастерская</div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="font-semibold text-text">{company.name}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                company.status === 'active'
                  ? 'bg-status-done/20 text-status-done'
                  : company.status === 'blocked'
                    ? 'bg-status-error/20 text-status-error'
                    : 'bg-status-process/20 text-status-process'
              }`}
            >
              {company.status === 'active'
                ? 'В каталоге'
                : company.status === 'blocked'
                  ? 'Заблокирована'
                  : 'На проверке'}
            </span>
          </div>
          <Link
            href="/dashboard/company"
            className="press mt-4 inline-block rounded-full bg-sand px-5 py-2.5 text-sm text-text transition-colors hover:bg-gold hover:text-white"
          >
            Изменить мастерскую
          </Link>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="lift rounded-3xl bg-paper p-5 transition-colors hover:bg-sand"
          >
            <div className="font-semibold text-text">{link.label}</div>
            <div className="mt-1 text-sm text-text-muted">{link.hint}</div>
          </Link>
        ))}
      </div>

      <form action={signOut} className="mt-4">
        <button
          type="submit"
          className="press w-full rounded-3xl bg-paper p-5 text-left font-semibold text-status-error transition-colors hover:bg-status-error/10"
        >
          Выйти из аккаунта
        </button>
      </form>
    </div>
  )
}
