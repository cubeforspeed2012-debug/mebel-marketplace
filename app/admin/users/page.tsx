import Link from 'next/link'
import { formatPhone } from '@/lib/constants'
import { requireAdmin } from '@/lib/session'
import { UserActions } from './user-actions'

export const metadata = { title: 'Аккаунты' }

type AdminUser = {
  user_id: string
  email: string | null
  full_name: string | null
  phone: string | null
  role: string
  created_at: string
  last_sign_in_at: string | null
  banned_until: string | null
  company_id: number | null
  company_name: string | null
  company_status: string | null
  orders_count: number
  clients_count: number
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Администратор',
  seller: 'Мастер',
  buyer: 'Покупатель',
}

const FILTERS = [
  { value: '', label: 'Все' },
  { value: 'seller', label: 'Мастера' },
  { value: 'buyer', label: 'Покупатели' },
  { value: 'blocked', label: 'Заблокированные' },
]

function isBlocked(user: AdminUser) {
  return Boolean(user.banned_until && new Date(user.banned_until) > new Date())
}

function shortDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; ok?: string; error?: string }>
}) {
  const { role: filter, ok, error } = await searchParams
  const { supabase, user: me } = await requireAdmin()

  const { data } = await supabase.rpc('admin_users')
  const all = (data ?? []) as AdminUser[]

  const users =
    filter === 'blocked'
      ? all.filter(isBlocked)
      : filter
        ? all.filter((u) => u.role === filter)
        : all

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Аккаунты</h1>
        <p className="mt-2 text-sm text-[#8f8f8f]">
          Все, кто зарегистрирован на площадке. Отсюда можно закрыть вход или удалить аккаунт.
        </p>
      </div>

      {ok === 'block' && (
        <p className="rounded-2xl bg-[#4b9d63]/15 px-4 py-3 text-sm text-[#7fd39a]">
          Готово, доступ изменён.
        </p>
      )}
      {ok === 'delete' && (
        <p className="rounded-2xl bg-[#4b9d63]/15 px-4 py-3 text-sm text-[#7fd39a]">
          Аккаунт удалён вместе с его мастерской.
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-[#b91c1c]/15 px-4 py-3 text-sm text-[#f0908f]">{error}</p>
      )}

      <section className="rounded-3xl bg-[#1f1f1f] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[#8f8f8f]">
            Всего: {all.length} · показано: {users.length}
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = (filter ?? '') === item.value
              return (
                <Link
                  key={item.label}
                  href={item.value ? `/admin/users?role=${item.value}` : '/admin/users'}
                  className={`press rounded-full px-4 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-white font-semibold text-[#171717]'
                      : 'bg-[#2a2a2a] text-[#a8a8a8] hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        {users.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#3a3a3a] p-12 text-center text-[#8f8f8f]">
            Никого нет.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs text-[#6b6b6b]">
                <tr>
                  <th className="px-4 py-3 font-normal">Человек</th>
                  <th className="px-4 py-3 font-normal">Роль</th>
                  <th className="px-4 py-3 font-normal">Мастерская</th>
                  <th className="px-4 py-3 font-normal">Регистрация</th>
                  <th className="px-4 py-3 font-normal">Последний вход</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const blocked = isBlocked(user)

                  return (
                    <tr
                      key={user.user_id}
                      className="border-t border-[#2c2c2c] transition-colors hover:bg-[#242424]"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-semibold text-white">
                            {(user.full_name ?? user.email ?? '?').charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-white">
                              {user.full_name ?? 'Без имени'}
                              {blocked && (
                                <span className="ml-2 rounded-full bg-[#b91c1c]/20 px-2 py-0.5 text-xs font-medium text-[#f0908f]">
                                  Заблокирован
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-[#8f8f8f]">
                              {user.email}
                              {user.phone && ` · ${formatPhone(user.phone)}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-[#3f6fd8]/20 text-[#9ab6f5]'
                              : user.role === 'seller'
                                ? 'bg-gold/20 text-gold'
                                : 'bg-[#2a2a2a] text-[#a8a8a8]'
                          }`}
                        >
                          {ROLE_LABEL[user.role] ?? user.role}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {user.company_id ? (
                          <Link
                            href={`/admin/company/${user.company_id}`}
                            className="text-[#d6d6d6] hover:text-gold"
                          >
                            {user.company_name}
                            <span className="block text-xs text-[#6b6b6b]">
                              заявок {user.orders_count} · клиентов {user.clients_count}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-[#6b6b6b]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-[#8f8f8f]">{shortDate(user.created_at)}</td>
                      <td className="px-4 py-4 text-[#8f8f8f]">
                        {shortDate(user.last_sign_in_at)}
                      </td>

                      <td className="px-4 py-4">
                        <UserActions
                          userId={user.user_id}
                          name={user.full_name ?? user.email ?? 'аккаунт'}
                          blocked={blocked}
                          canManage={user.user_id !== me.id && user.role !== 'admin'}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-5 text-xs leading-relaxed text-[#6b6b6b]">
          Блокировка закрывает вход, но всё содержимое остаётся — доступ можно вернуть.
          Удаление стирает аккаунт вместе с мастерской, товарами, заявками и клиентами, и вернуть его нельзя.
          Администраторов ни заблокировать, ни удалить отсюда нельзя — это защита от случайной потери доступа к площадке.
        </p>
      </section>
    </div>
  )
}
