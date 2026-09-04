'use client'

import { deleteUser, setUserBlocked } from '@/app/admin/actions'
import { SubmitButton } from '@/components/submit-button'

/**
 * Кнопки по аккаунту. Удаление спрашивает подтверждение —
 * вместе с человеком уходит его мастерская, вернуть будет нечем.
 */
export function UserActions({
  userId,
  name,
  blocked,
  canManage,
}: {
  userId: string
  name: string
  blocked: boolean
  canManage: boolean
}) {
  if (!canManage) {
    return <span className="text-xs text-[#6b6b6b]">Это вы</span>
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={setUserBlocked}>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="blocked" value={blocked ? '0' : '1'} />
        <SubmitButton
          pendingLabel="Меняем…"
          className={`rounded-full px-4 py-2 text-xs ${
            blocked
              ? 'bg-[#4b9d63] text-white hover:bg-[#3f8654]'
              : 'bg-[#2a2a2a] text-[#d6d6d6] hover:bg-[#e8c14a] hover:text-[#3b2f10]'
          }`}
        >
          {blocked ? 'Разблокировать' : 'Заблокировать'}
        </SubmitButton>
      </form>

      <form
        action={deleteUser}
        onSubmit={(event) => {
          const ok = window.confirm(
            `Удалить аккаунт «${name}»?\n\nВместе с ним удалится мастерская, товары, заявки и клиенты. Отменить это будет нельзя.`,
          )
          if (!ok) event.preventDefault()
        }}
      >
        <input type="hidden" name="user_id" value={userId} />
        <SubmitButton
          pendingLabel="Удаляем…"
          className="rounded-full bg-[#2a2a2a] px-4 py-2 text-xs text-[#8f8f8f] hover:bg-[#b91c1c] hover:text-white"
        >
          Удалить
        </SubmitButton>
      </form>
    </div>
  )
}
