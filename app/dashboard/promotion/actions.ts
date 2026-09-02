'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type FormState = { error?: string; message?: string }

/** Тарифы продвижения. Цены в сумах — меняются здесь, в одном месте. */
export const BOOST_PLANS = {
  '5h': { hours: 5, amount: 15000, label: 'Поднятие на 5 часов' },
  '24h': { hours: 24, amount: 45000, label: 'Топ на сутки' },
  '7d': { hours: 168, amount: 200000, label: 'Топ на неделю' },
} as const

export type BoostPlan = keyof typeof BOOST_PLANS

/**
 * Заявка на продвижение. Пока оплата подключается вручную:
 * запись создаётся со статусом «ждёт оплаты», администратор подтверждает.
 * Когда подключим Payme или Click — статус будет ставиться автоматически.
 */
export async function requestBoost(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Сначала войдите' }

  const { data: company } = await supabase
    .from('companies')
    .select('id, status')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!company) return { error: 'Сначала создайте профиль мастерской' }
  if (company.status !== 'active') {
    return { error: 'Продвижение доступно после проверки мастерской' }
  }

  const planKey = String(formData.get('plan') ?? '') as BoostPlan
  const plan = BOOST_PLANS[planKey]
  if (!plan) return { error: 'Выберите тариф' }

  const productId = formData.get('product_id') ? Number(formData.get('product_id')) : null

  const startsAt = new Date()
  const endsAt = new Date(startsAt.getTime() + plan.hours * 60 * 60 * 1000)

  const { error } = await supabase.from('promotions').insert({
    company_id: company.id,
    product_id: productId,
    kind: 'boost',
    hours: plan.hours,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    amount: plan.amount,
    payment_provider: 'manual',
    status: 'pending',
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/promotion')
  return {
    message:
      'Заявка на продвижение создана. Как только оплата подтвердится, мебель поднимется в каталоге.',
  }
}
