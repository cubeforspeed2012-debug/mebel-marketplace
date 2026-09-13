'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Удаление своего аккаунта. Возврата нет — поэтому спрашиваем подтверждение в окне. */
export async function deleteOwnAccount() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { error } = await supabase.rpc('delete_own_account')

  if (error) {
    redirect(`/profile/settings?error=${encodeURIComponent(error.message)}`)
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/?deleted=1')
}
