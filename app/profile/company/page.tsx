import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CompanyForm } from '@/app/dashboard/company/company-form'
import { ScreenHeader } from '@/components/settings-list'
import { createClient, currentUser } from '@/lib/supabase/server'
import type { Company } from '@/lib/types'

export const metadata = { title: 'Моя мастерская' }

/** Мастерская целиком: название, логотип, контакты, описание. */
export default async function ProfileCompanyPage() {
  const supabase = await createClient()

  const user = await currentUser()
  if (!user) redirect('/auth?next=/profile/company')

  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  const company = (data as Company | null) ?? null

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <ScreenHeader title="Моя мастерская" />

      {!company && (
        <p className="mb-4 text-sm leading-relaxed text-text-muted">
          Заполните — и вы появитесь в каталоге. Телефон, Telegram и Instagram отсюда
          покупатели увидят на вашей странице. Проверка занимает день.
        </p>
      )}

      {company?.status === 'pending' && (
        <p className="mb-4 rounded-2xl bg-status-process/15 px-4 py-3 text-sm text-status-process">
          Мастерская на проверке. Как только администратор её откроет, вы появитесь в каталоге.
        </p>
      )}

      {company?.status === 'blocked' && (
        <p className="mb-4 rounded-2xl bg-status-error/15 px-4 py-3 text-sm text-status-error">
          Мастерская скрыта из каталога.{' '}
          {company.moderation_note ?? 'Свяжитесь с администратором площадки.'}
        </p>
      )}

      {company?.status === 'active' && (
        <Link
          href={`/company/${company.slug ?? company.id}`}
          className="mb-4 inline-block text-sm text-gold hover:underline"
        >
          Посмотреть, как видят покупатели →
        </Link>
      )}

      <CompanyForm company={company} />
    </div>
  )
}
