import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { SettingsGroup, SettingsRow } from '@/components/settings-list'
import {
  IconChart,
  IconDoc,
  IconGear,
  IconHelp,
  IconOrders,
  IconPanel,
  IconPhotos,
  IconRequests,
  IconRocket,
  IconShield,
  IconStore,
  IconUser,
} from '@/components/ui-icons'
import { formatPhone } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Профиль' }

/**
 * Профиль — оглавление приложения. Список понятных пунктов: нажал —
 * открылся отдельный экран. Так устроены все приложения, которыми
 * человек пользуется каждый день, и учить тут нечего.
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

  // Мастеру показываем его дела с живыми цифрами, чтобы не заходить наугад
  let company: { id: number; name: string; status: string } | null = null
  let newOrders = 0
  let works = 0

  if (isMaster) {
    const { data } = await supabase
      .from('companies')
      .select('id, name, status')
      .eq('owner_user_id', user.id)
      .maybeSingle()
    company = data

    if (company) {
      const [orders, products] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'new'),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id),
      ])
      newOrders = orders.count ?? 0
      works = products.count ?? 0
    }
  }

  const statusLabel =
    company?.status === 'active'
      ? 'В каталоге'
      : company?.status === 'blocked'
        ? 'Скрыта'
        : company
          ? 'На проверке'
          : 'Не заполнена'

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-10">
      {/* Кто вы */}
      <div className="flex items-center gap-4 rounded-3xl bg-paper p-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold text-xl font-semibold text-white">
          {(profile?.full_name ?? user.email ?? 'М').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="display truncate text-lg text-text">
            {profile?.full_name ?? 'Без имени'}
          </div>
          <div className="mt-0.5 truncate text-sm text-text-muted">
            {profile?.phone ? formatPhone(profile.phone) : user.email}
          </div>
        </div>
      </div>

      {/* Дела мастера */}
      {isMaster && (
        <SettingsGroup title="Моё дело">
          <SettingsRow
            href="/profile/company"
            icon={<IconStore />}
            label="Моя мастерская"
            value={statusLabel}
          />
          <SettingsRow
            href="/dashboard/products"
            icon={<IconPhotos />}
            label="Мои работы"
            value={works > 0 ? String(works) : undefined}
          />
          <SettingsRow
            href="/dashboard/orders"
            icon={<IconOrders />}
            label="Заказы"
            badge={newOrders}
          />
          <SettingsRow href="/dashboard" icon={<IconChart />} label="Аналитика" />
          <SettingsRow href="/dashboard/clients" icon={<IconRequests />} label="Клиенты" />
          <SettingsRow href="/dashboard/promotion" icon={<IconRocket />} label="Продвижение" />
        </SettingsGroup>
      )}

      {/* Покупателю — его заявки и приглашение стать мастером */}
      {!isMaster && (
        <SettingsGroup>
          <SettingsRow href="/account" icon={<IconRequests />} label="Мои заявки" />
          <SettingsRow href="/profile/company" icon={<IconStore />} label="Стать мастером" />
        </SettingsGroup>
      )}

      {/* Управление площадкой */}
      {role === 'admin' && (
        <SettingsGroup title="Площадка">
          <SettingsRow href="/admin" icon={<IconPanel />} label="Панель управления" />
        </SettingsGroup>
      )}

      <SettingsGroup>
        <SettingsRow href="/profile/edit" icon={<IconUser />} label="Личные данные" />
        <SettingsRow href="/profile/settings" icon={<IconGear />} label="Настройки" />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow href="/terms" icon={<IconDoc />} label="Условия" />
        <SettingsRow href="/privacy" icon={<IconShield />} label="Конфиденциальность" />
        <SettingsRow href="/profile/help" icon={<IconHelp />} label="Помощь и связь" />
      </SettingsGroup>

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="press w-full rounded-full bg-gold py-4 font-semibold text-white transition-colors hover:bg-gold-deep"
        >
          Выйти
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-text-muted">Mebel · Ташкент · версия 1.0</p>
    </div>
  )
}
