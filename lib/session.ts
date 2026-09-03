import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/lib/types'

/** Пользователь кабинета вместе с его мастерской (если уже создана). */
export async function getSellerContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

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

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return { supabase, user, profile }
}
