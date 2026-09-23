'use server'

import { revalidatePath } from 'next/cache'
import { createClient, currentUser } from '@/lib/supabase/server'
import { checkVerificationCode, sendVerificationCode, toE164 } from '@/lib/telegram-gateway'

export type PhoneCodeState = { requestId?: string; tail?: string; ok?: boolean; error?: string }

/**
 * Отправить код в Telegram на номер мастерской.
 *
 * Номер берём из базы, а не из формы: иначе через нас можно было бы
 * слать коды на любые чужие номера, и платили бы за это мы.
 */
export async function sendPhoneCode(): Promise<PhoneCodeState> {
  const user = await currentUser()
  if (!user) return { error: 'Войдите в аккаунт' }

  const supabase = await createClient()
  const { data: company } = await supabase
    .from('companies')
    .select('phone_public, phone_verified')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!company?.phone_public) return { error: 'Сначала укажите телефон в профиле мастерской' }
  if (company.phone_verified) return { ok: true }

  const phone = toE164(company.phone_public)
  if (phone.replace(/\D/g, '').length < 11) return { error: 'Проверьте номер в профиле — в нём не хватает цифр' }

  const { data: allowed } = await supabase.rpc('phone_code_allowed')
  if (allowed === 'wait') return { error: 'Код уже отправлен. Новый можно запросить через минуту' }
  if (allowed === 'limit') return { error: 'Слишком много попыток за сегодня. Попробуйте завтра' }
  if (allowed !== 'ok') return { error: 'Не получилось. Попробуйте ещё раз' }

  const sent = await sendVerificationCode(phone)
  if (!sent.ok) {
    // Номер без Telegram — код доставить некуда
    if (/PHONE_NUMBER|NOT_FOUND|UNAVAILABLE/i.test(sent.error)) {
      return { error: 'На этот номер не зарегистрирован Telegram. Подтвердите через нашего бота — ниже' }
    }
    return { error: 'Telegram сейчас не отправил код. Попробуйте через минуту или через нашего бота' }
  }

  return { requestId: sent.result.request_id, tail: phone.slice(-4) }
}

/** Проверить введённый код. Галочку ставит база — и только по ответу Telegram. */
export async function confirmPhoneCode(requestId: string, code: string): Promise<PhoneCodeState> {
  const clean = code.replace(/\D/g, '')
  if (!requestId || clean.length < 4) return { requestId, error: 'Введите код из Telegram' }

  const checked = await checkVerificationCode(requestId, clean)
  if (!checked.ok) return { requestId, error: 'Не получилось проверить код. Попробуйте ещё раз' }

  const status = checked.result.verification_status?.status
  if (status === 'code_invalid') return { requestId, error: 'Код неверный. Проверьте цифры' }
  if (status === 'code_max_attempts_exceeded') return { error: 'Слишком много неверных попыток. Запросите новый код' }
  if (status === 'expired') return { error: 'Код устарел. Запросите новый' }
  if (status !== 'code_valid') return { requestId, error: 'Код не подошёл' }

  const supabase = await createClient()
  const { data } = await supabase.rpc('verify_phone_by_gateway', {
    p_secret: process.env.AI_MODERATION_SECRET ?? '',
    p_phone: checked.result.phone_number,
  })

  const result = (data as { status?: string } | null)?.status
  if (result === 'mismatch') return { error: 'Номер в профиле изменился. Запросите код заново' }
  if (result !== 'ok') return { error: 'Не получилось сохранить. Напишите в поддержку' }

  revalidatePath('/dashboard')
  revalidatePath('/profile/company')
  return { ok: true }
}
