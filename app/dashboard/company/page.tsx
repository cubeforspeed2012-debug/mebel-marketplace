import { getSellerContext } from '@/lib/session'
import { CompanyForm } from './company-form'

export const metadata = { title: 'Профиль мастерской' }

export default async function CompanyPage() {
  const { company } = await getSellerContext()

  return (
    <div>
      <h2 className="display gold-rule text-xl">Профиль мастерской</h2>
      <p className="mt-5 mb-7 max-w-2xl leading-relaxed text-text-muted">
        {company
          ? 'Это то, что видят покупатели на вашей странице. Чем полнее заполнено — тем больше звонков.'
          : 'Заполните профиль — и вы появитесь в каталоге. После сохранения мастерскую проверит администратор.'}
      </p>

      {company?.status === 'blocked' && (
        <p className="mb-6 border border-[#b91c1c]/40 bg-[#b91c1c]/15 px-4 py-3 text-sm text-status-error">
          Мастерская заблокирована.{' '}
          {company.moderation_note ?? 'Свяжитесь с поддержкой площадки.'}
        </p>
      )}

      <CompanyForm company={company} />
    </div>
  )
}
