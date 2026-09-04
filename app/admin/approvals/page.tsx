import Link from 'next/link'
import { setCompanyStatus } from '@/app/admin/actions'
import { formatPhone, telHref, WORK_TYPES } from '@/lib/constants'
import { requireAdmin } from '@/lib/session'
import type { Company } from '@/lib/types'

export const metadata = { title: 'Одобрение' }

/**
 * Очередь на одобрение. Всё, что нужно для решения, — на одном экране:
 * кто это, чем занимается, куда звонить и что он уже выложил.
 */
export default async function ApprovalsPage() {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const pending = (data ?? []) as Company[]

  // Сколько работ уже выложил каждый — по этому видно, серьёзно ли человек настроен
  const counts = new Map<number, number>()
  if (pending.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, company_id')
      .in(
        'company_id',
        pending.map((c) => c.id),
      )

    for (const product of products ?? []) {
      counts.set(product.company_id, (counts.get(product.company_id) ?? 0) + 1)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Одобрение мастерских</h1>
        <p className="mt-2 text-sm text-[#8f8f8f]">
          Новые мастерские не попадают в каталог, пока вы их не откроете.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-3xl bg-[#1f1f1f] p-12 text-center">
          <div className="text-lg font-semibold text-white">Очередь пуста</div>
          <p className="mt-2 text-sm text-[#8f8f8f]">
            Все заявки разобраны. Новые появятся здесь сами.
          </p>
          <Link
            href="/admin"
            className="press mt-6 inline-block rounded-full bg-[#2a2a2a] px-5 py-2.5 text-sm text-[#d6d6d6] transition-colors hover:bg-white hover:text-[#171717]"
          >
            К сводке
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((company) => (
            <div key={company.id} className="rounded-3xl bg-[#1f1f1f] p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-[#2a2a2a]">
                  {company.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl font-semibold text-gold">
                      {company.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-white">{company.name}</div>
                  <div className="mt-1 text-sm text-[#8f8f8f]">
                    {company.work_type && WORK_TYPES[company.work_type]}
                    {company.district && ` · ${company.district} район`}
                    {' · подал(а) '}
                    {new Date(company.created_at).toLocaleDateString('ru-RU')}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    {company.phone_public ? (
                      <a href={telHref(company.phone_public)} className="text-gold hover:underline">
                        {formatPhone(company.phone_public)}
                      </a>
                    ) : (
                      <span className="text-status-error">Телефон не указан</span>
                    )}
                    <span className="text-[#8f8f8f]">
                      Работ выложено: {counts.get(company.id) ?? 0}
                    </span>
                  </div>

                  {company.description ? (
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#a8a8a8]">
                      {company.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-status-process">
                      Описание не заполнено — в каталоге будет пусто
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#2c2c2c] pt-5">
                <form action={setCompanyStatus}>
                  <input type="hidden" name="id" value={company.id} />
                  <input type="hidden" name="status" value="active" />
                  <button
                    type="submit"
                    className="press rounded-full bg-[#4b9d63] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f8654]"
                  >
                    Одобрить
                  </button>
                </form>

                <form action={setCompanyStatus} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={company.id} />
                  <input type="hidden" name="status" value="blocked" />
                  <input
                    name="note"
                    placeholder="Причина отказа"
                    className="rounded-full bg-[#2a2a2a] px-4 py-2.5 text-sm text-white outline-none placeholder:text-[#6b6b6b] focus:ring-2 focus:ring-gold"
                  />
                  <button
                    type="submit"
                    className="press rounded-full bg-[#2a2a2a] px-5 py-2.5 text-sm text-[#a8a8a8] transition-colors hover:bg-status-error hover:text-white"
                  >
                    Отклонить
                  </button>
                </form>

                <Link
                  href={`/admin/company/${company.id}`}
                  className="press ml-auto rounded-full bg-[#2a2a2a] px-5 py-2.5 text-sm text-[#d6d6d6] transition-colors hover:bg-white hover:text-[#171717]"
                >
                  Подробнее
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs leading-relaxed text-[#6b6b6b]">
        Одобрение открывает мастерскую в каталоге. Отклонение прячет её и сохраняет
        причину — мастер увидит её у себя в кабинете и сможет исправить.
      </p>
    </div>
  )
}
