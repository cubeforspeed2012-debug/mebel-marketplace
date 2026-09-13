import { redirect } from 'next/navigation'
import { ScreenHeader } from '@/components/settings-list'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '../profile-form'

export const metadata = { title: 'Личные данные' }

export default async function ProfileEditPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/profile/edit')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <ScreenHeader title="Личные данные" />

      <p className="mb-4 text-sm leading-relaxed text-text-muted">
        Имя видят люди, с которыми вы общаетесь на площадке. Почта — {user.email} — меняется
        через поддержку.
      </p>

      <ProfileForm fullName={profile?.full_name ?? ''} phone={profile?.phone ?? ''} />
    </div>
  )
}
