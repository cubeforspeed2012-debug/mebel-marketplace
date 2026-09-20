import Link from 'next/link'
import { setCompanyStatus, setProductStatus } from '@/app/admin/actions'
import { formatPhone, telHref, WORK_TYPES } from '@/lib/constants'
import { requireAdmin } from '@/lib/session'
import type { Company } from '@/lib/types'
import { SubmitButton } from '@/components/submit-button'

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

  // Работы на проверке: пока их не откроют, в каталоге их нет
  const { data: productRows } = await supabase
    .from('products')
    .select(
      'id, title, description, price, price_from, currency, type, status, created_at, moderation_verdict, moderation_reason, companies (id, name, slug), product_images (url, sort_order)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  type PendingProduct = {
    id: number
    title: string
    description: string | null
    price: number | null
    price_from: boolean
    currency: string
    created_at: string
    moderation_verdict: string | null
    moderation_reason: string | null
    companies: { id: number; name: string; slug: string | null } | null
    product_images: { url: string; sort_order: number | null }[] | null
  }

  const pendingProducts = (productRows ?? []) as unknown as PendingProduct[]

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
        <h1 className="text-2xl font-semibold text-text">Очередь на проверку</h1>
        <p className="mt-2 text-sm text-text-muted">
          Ни мастерская, ни работа не попадают в каталог, пока вы их не откроете.
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-sand px-4 py-1.5 text-text">
            Мастерских: <b>{pending.length}</b>
          </span>
          <span className="rounded-full bg-sand px-4 py-1.5 text-text">
            Работ: <b>{pendingProducts.length}</b>
          </span>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-3xl bg-paper p-12 text-center">
          <div className="text-lg font-semibold text-text">Очередь пуста</div>
          <p className="mt-2 text-sm text-text-muted">
            Все заявки разобраны. Новые появятся здесь сами.
          </p>
          <Link
            href="/admin"
            className="press mt-6 inline-block rounded-full bg-sand px-5 py-2.5 text-sm text-text transition-colors hover:bg-gold hover:text-white"
          >
            К сводке
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((company) => (
            <div key={company.id} className="rounded-3xl bg-paper p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-sand">
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
                  <div className="text-lg font-semibold text-text">{company.name}</div>
                  <div className="mt-1 text-sm text-text-muted">
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
                    <span className="text-text-muted">
                      Работ выложено: {counts.get(company.id) ?? 0}
                    </span>
                  </div>

                  {company.description ? (
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
                      {company.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-status-process">
                      Описание не заполнено — в каталоге будет пусто
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                <form action={setCompanyStatus}>
                  <input type="hidden" name="id" value={company.id} />
                  <input type="hidden" name="status" value="active" />
                  <SubmitButton
                    pendingLabel="Одобряем…"
                    className="rounded-full bg-[#4b9d63] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3f8654]"
                  >
                    Одобрить
                  </SubmitButton>
                </form>

                <form action={setCompanyStatus} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={company.id} />
                  <input type="hidden" name="status" value="blocked" />
                  <input
                    name="note"
                    placeholder="Причина отказа"
                    className="rounded-full bg-sand px-4 py-2.5 text-sm text-text outline-none placeholder:text-text-muted focus:ring-2 focus:ring-gold"
                  />
                  <SubmitButton
                    pendingLabel="Отклоняем…"
                    className="rounded-full bg-sand px-5 py-2.5 text-sm text-text-muted hover:bg-status-error hover:text-white"
                  >
                    Отклонить
                  </SubmitButton>
                </form>

                <Link
                  href={`/admin/company/${company.id}`}
                  className="press ml-auto rounded-full bg-sand px-5 py-2.5 text-sm text-text transition-colors hover:bg-gold hover:text-white"
                >
                  Подробнее
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/*
        Работы проверяем отдельно от мастерских: мастерскую открывают
        один раз, а работы он добавляет постоянно — и каждая из них
        может оказаться чужими фото из интернета.
      */}
      <section>
        <h2 className="text-xl font-semibold text-text">Работы на проверке</h2>
        <p className="mt-2 text-sm text-text-muted">
          Сюда попадает только то, в чём автопроверка не уверена: остальное
          она пропускает сама. Плюс работы, у которых мастер поменял описание,
          цену или фотографии после одобрения.
        </p>

        {pendingProducts.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-paper p-10 text-center text-sm text-text-muted">
            Новых работ нет.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingProducts.map((product) => {
              const photo = (product.product_images ?? [])
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]

              return (
                <div key={product.id} className="rounded-3xl bg-paper p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-sand">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-status-error">
                          Без фото
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-text">{product.title}</div>
                      <div className="mt-1 text-sm text-text-muted">
                        {product.companies?.name ?? 'Мастерская удалена'}
                        {' · добавлено '}
                        {new Date(product.created_at).toLocaleDateString('ru-RU')}
                      </div>
                      <div className="mt-1 text-sm text-gold">
                        {product.price
                          ? `${product.price_from ? 'от ' : ''}${Number(product.price).toLocaleString('ru-RU')} ${product.currency === 'UZS' ? 'сум' : product.currency}`
                          : 'Цена не указана'}
                      </div>
                      {product.description && (
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
                          {product.description.slice(0, 400)}
                        </p>
                      )}

                      {/* Что сказала автопроверка — чтобы не перечитывать всё заново */}
                      {product.moderation_reason && (
                        <p className="mt-3 rounded-xl bg-sand px-3 py-2 text-sm leading-relaxed text-text-muted">
                          <b className="text-text">Автопроверка:</b> {product.moderation_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                    <form action={setProductStatus}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="status" value="active" />
                      <SubmitButton
                        pendingLabel="Открываем…"
                        className="rounded-full bg-[#4b9d63] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3f8654]"
                      >
                        В каталог
                      </SubmitButton>
                    </form>

                    <form action={setProductStatus}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="status" value="hidden" />
                      <SubmitButton
                        pendingLabel="Отклоняем…"
                        className="rounded-full bg-sand px-5 py-2.5 text-sm text-text-muted hover:bg-status-error hover:text-white"
                      >
                        Отклонить
                      </SubmitButton>
                    </form>

                    {product.companies?.slug && (
                      <Link
                        href={`/company/${product.companies.slug}`}
                        className="press ml-auto rounded-full bg-sand px-5 py-2.5 text-sm text-text transition-colors hover:bg-gold hover:text-white"
                      >
                        Мастерская
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-text-muted">
        Одобрение открывает мастерскую или работу в каталоге. Отклонение прячет
        и сохраняет причину — мастер увидит её у себя в кабинете и сможет исправить.
        Если после одобрения мастер поменяет содержимое работы или её фотографии,
        она вернётся сюда сама.
      </p>
    </div>
  )
}
