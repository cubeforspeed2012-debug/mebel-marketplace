import { createClient, currentUser } from '@/lib/supabase/server'

/**
 * Кто открыл мини-приложение. Оба экрана показывают одно и то же
 * приветствие гостю, поэтому проверка живёт в одном месте.
 */
export async function getTgContext() {
  const supabase = await createClient()
  const user = await currentUser()

  if (!user) return { state: 'guest' as const, supabase }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, status, views_count, rating_avg, rating_count')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!company) return { state: 'no-company' as const, supabase }

  return { state: 'master' as const, supabase, company }
}

/** Приветствие и две двери — показываем на любом экране, пока не вошли. */
export function tgGuestScreen() {
  return { title: 'Добро пожаловать в Mebel' }
}
