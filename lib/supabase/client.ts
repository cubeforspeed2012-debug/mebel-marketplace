'use client'

import { createBrowserClient } from '@supabase/ssr'

/** Supabase в браузере — для входа, регистрации и кабинета продавца. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
