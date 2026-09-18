import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import type { Company } from '@/lib/types'

/**
 * Пускает дальше только вошедшего.
 *
 * Отдельно разбираем случай, когда Supabase не ответил: вход при этом
 * в порядке, и уводить человека на регистрацию — худшее, что можно сделать.
 * Он решит, что аккаунт пропал вместе со всеми работами. Лучше честно
 * сказать «сервер занят, обновите страницу» и оставить его вошедшим.
 */
export async function requireUser(signInPath: string) {
  const { user, authUnavailable } = await getCurrentUser()
  if (user) return user

  if (authUnavailable) {
    throw new Error('Сервер входа не ответил. Обновите страницу через минуту — вы не вышли из аккаунта.')
  }

  redirect(signInPath)
}

/** Пользователь кабинета вместе с его мастерской (если уже создана). */
export async function getSellerContext() {
  const supabase = await createClient()
  const user = await requireUser('/auth')

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, onboarded')
    .eq('id', user.id)
    .maybeSingle()

  // Вошёл через Google и ещё не представился — сначала знакомство
  if (profile && !profile.onboarded) redirect('/welcome?next=/dashboard')

  return {
    supabase,
    user,
    profile,
    company: (company as Company | null) ?? null,
  }
}

/** Кабинет площадки: пускаем только администратора. */
export async function requireAdmin() {
  const supabase = await createClient()
  const user = await requireUser('/auth?next=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return { supabase, user, profile }
}
