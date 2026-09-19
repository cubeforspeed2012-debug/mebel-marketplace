import { currentUser } from '@/lib/supabase/server'
import { SupportChat } from './support-chat'

export const metadata = { title: 'Поддержка' }

/**
 * Поддержка: помощник отвечает сразу, администратор — если не справился.
 * Открыта и гостям: чаще всего за помощью идёт тот, кто не может войти.
 */
export default async function SupportPage() {
  const user = await currentUser()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-10">
      <h1 className="display text-2xl text-text">Поддержка</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        Помощник знает, как устроен сайт, и отвечает сразу. Не справится — позовёте
        администратора, и он увидит всю переписку.
      </p>

      <div className="mt-5">
        <SupportChat signedInContact={user?.email ?? null} />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-text-muted">
        Мы никогда не просим пароль, код из СМС и номер карты — ни здесь, ни в Telegram.
      </p>
    </div>
  )
}
