import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ScreenHeader } from '@/components/settings-list'
import { IconGlobe, IconLock, IconMoon, IconTrash } from '@/components/ui-icons'
import { createClient } from '@/lib/supabase/server'
import { deleteOwnAccount } from './actions'
import { DeleteAccount, LanguageSetting, ThemeSetting } from './settings-controls'

export const metadata = { title: 'Настройки' }

function Card({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-4 rounded-3xl bg-paper p-5">
      <div className="flex items-center gap-3">
        <span className="text-text-muted">{icon}</span>
        <h2 className="font-semibold text-text">{title}</h2>
      </div>
      {hint && <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/profile/settings')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const store = await cookies()
  const theme = store.get('theme')?.value === 'dark' ? 'dark' : 'light'

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-10">
      <ScreenHeader title="Настройки" />

      {error && (
        <p className="rounded-2xl bg-status-error/15 px-4 py-3 text-sm text-status-error">{error}</p>
      )}

      <Card icon={<IconGlobe />} title="Язык приложения">
        <LanguageSetting />
      </Card>

      <Card icon={<IconMoon />} title="Оформление" hint="Тёмное бережёт глаза вечером, светлое привычнее днём.">
        <ThemeSetting initial={theme} />
      </Card>

      <Card icon={<IconLock />} title="Безопасность">
        <Link
          href="/auth/new-password"
          className="press block w-full rounded-2xl bg-cream py-3.5 text-center text-sm font-semibold text-text transition-colors hover:bg-sand"
        >
          Сменить пароль
        </Link>
      </Card>

      {profile?.role !== 'admin' && (
        <Card
          icon={<IconTrash />}
          title="Удаление аккаунта"
          hint="Аккаунт исчезнет вместе с мастерской, работами, заказами и клиентами. Восстановить нельзя."
        >
          <DeleteAccount action={deleteOwnAccount} />
        </Card>
      )}
    </div>
  )
}
