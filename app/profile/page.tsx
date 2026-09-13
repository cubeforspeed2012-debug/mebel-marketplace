import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { CompanyForm } from '@/app/dashboard/company/company-form'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/lib/types'
import { ProfileForm } from './profile-form'

export const metadata = { title: 'Профиль' }

/**
 * Один экран про человека и его мастерскую. Имя и телефон — сверху,
 * мастерская со всеми контактами — ниже. Ничего не спрятано по разделам.
 */
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

  const role = profile?.role ?? 'buyer'
  const isMaster = role === 'seller' || role === 'admin'

  let company: Company | null = null
  if (isMaster) {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle()
    company = (data as Company | null) ?? null
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      {/* Кто вы */}
      <div className="mb-5 flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold text-xl font-semibold text-white">
          {(profile?.full_name ?? user.email ?? 'М').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="display truncate text-xl text-text">{profile?.full_name ?? 'Без имени'}</h1>
          <div className="mt-0.5 truncate text-sm text-text-muted">{user.email}</div>
        </div>
      </div>

      <ProfileForm fullName={profile?.full_name ?? ''} phone={profile?.phone ?? ''} />

      {/* Мастерская — всё, что видят покупатели */}
      {isMaster && (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="display text-lg text-text">Моя мастерская</h2>
            {company?.status === 'active' && (
              <Link
                href={`/company/${company.slug ?? company.id}`}
                className="text-sm text-gold hover:underline"
              >
                Как видят покупатели →
              </Link>
            )}
          </div>

          {!company && (
            <p className="mb-4 text-sm leading-relaxed text-text-muted">
              Заполните — и вы появитесь в каталоге. Телефон, Telegram и Instagram отсюда
              покупатели увидят на вашей странице.
            </p>
          )}

          {company?.status === 'blocked' && (
            <p className="mb-4 rounded-2xl bg-status-error/15 px-4 py-3 text-sm text-status-error">
              Мастерская скрыта из каталога.{' '}
              {company.moderation_note ?? 'Свяжитесь с администратором площадки.'}
            </p>
          )}

          <CompanyForm company={company} />
        </section>
      )}

      {/* Покупателю — его заявки */}
      {role === 'buyer' && (
        <Link
          href="/account"
          className="lift mt-4 block rounded-3xl bg-paper p-5 transition-colors hover:bg-sand"
        >
          <div className="font-semibold text-text">Мои заявки</div>
          <div className="mt-1 text-sm text-text-muted">Что я заказывал у мастеров</div>
        </Link>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {role === 'admin' && (
          <Link href="/admin" className="lift rounded-3xl bg-paper p-5 transition-colors hover:bg-sand">
            <div className="font-semibold text-text">Панель управления</div>
            <div className="mt-1 text-sm text-text-muted">Вся площадка</div>
          </Link>
        )}
        <Link
          href="/auth/new-password"
          className="lift rounded-3xl bg-paper p-5 transition-colors hover:bg-sand"
        >
          <div className="font-semibold text-text">Сменить пароль</div>
          <div className="mt-1 text-sm text-text-muted">Безопасность входа</div>
        </Link>
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
