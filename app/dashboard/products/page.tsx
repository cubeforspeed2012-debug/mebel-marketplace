import Link from 'next/link'
import { formatPrice, PRODUCT_TYPES } from '@/lib/constants'
import { getSellerContext } from '@/lib/session'
import type { Product, ProductImage } from '@/lib/types'
import { deleteProduct, toggleProductStatus } from './actions'
import { Portfolio, type PortfolioPhoto } from './portfolio'

export const metadata = { title: 'Мои работы' }

type Row = Product & { product_images: ProductImage[] }

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const { saved } = await searchParams
  const { supabase, company } = await getSellerContext()

  if (!company) {
    return (
      <div>
        <h2 className="display gold-rule text-xl">Мои работы</h2>
        <div className="mt-7 rounded-3xl rounded-3xl border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-text-muted">
            Сначала заполните профиль мастерской — без него мебель некуда прикрепить.
          </p>
          <Link
            href="/profile"
            className="press mt-5 inline-block rounded-full bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
          >
            Заполнить профиль
          </Link>
        </div>
      </div>
    )
  }

  const [productsResult, portfolioResult] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_images (id, product_id, url, sort_order)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('portfolio_photos')
      .select('id, url')
      .eq('company_id', company.id)
      .order('sort_order'),
  ])

  const products = (productsResult.data ?? []) as unknown as Row[]
  const portfolio = (portfolioResult.data ?? []) as PortfolioPhoto[]

  return (
    <div className="space-y-6">
      {/* Портфолио — первое, что видят на странице мастера */}
      <Portfolio photos={portfolio} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display gold-rule text-xl">Мебель в каталоге</h2>
        <Link
          href="/dashboard/products/new"
          className="press rounded-full bg-gold px-6 py-2.5 font-semibold text-white transition-colors hover:bg-gold-deep"
        >
          Добавить мебель
        </Link>
      </div>

      {saved && (
        <p className="rounded-2xl bg-status-done/15 px-4 py-3 text-sm text-status-done">Сохранено</p>
      )}

      <div className="mt-7 space-y-3">
        {products.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line bg-paper p-10 text-center">
            <p className="text-text-muted">
              Пока пусто. Добавьте первую работу — с фото её найдут в каталоге.
            </p>
          </div>
        )}

        {products.map((product) => {
          const cover = [...(product.product_images ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order,
          )[0]

          return (
            <div
              key={product.id}
              className="flex flex-wrap items-center gap-4 rounded-3xl bg-paper p-4"
            >
              <div className="size-16 shrink-0 overflow-hidden bg-cream">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-text-muted">
                    Нет фото
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{product.title}</div>
                <div className="mt-0.5 text-sm text-text-muted">
                  {product.type && PRODUCT_TYPES[product.type]} ·{' '}
                  {formatPrice(product.price, product.price_from)}
                </div>

                {/*
                  Почему работа не в каталоге — словами, прямо здесь.
                  Отказ без объяснения мастер воспринимает как поломку
                  и заводит работу заново, ничего не исправив.
                */}
                {product.moderation_reason && product.status !== 'active' && (
                  <p
                    className={`mt-2 rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      product.moderation_verdict === 'reject'
                        ? 'bg-status-error/10 text-status-error'
                        : 'bg-status-process/15 text-status-process'
                    }`}
                  >
                    {product.moderation_reason}
                  </p>
                )}
              </div>

              {/*
                Три разных состояния, и путать их нельзя: «на проверке» —
                это не «скрыто». Мастер должен понимать, что работа не
                потерялась, а ждёт администратора, иначе он будет
                пересоздавать её снова и снова.
              */}
              <span
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                  product.status === 'active'
                    ? 'bg-gold text-white'
                    : product.status === 'pending'
                      ? 'bg-status-process/20 text-status-process'
                      : 'border border-line text-text-muted'
                }`}
              >
                {product.status === 'active'
                  ? 'В каталоге'
                  : product.status === 'pending'
                    ? 'На проверке'
                    : product.status === 'draft'
                      ? 'Черновик'
                      : product.moderation_verdict === 'reject'
                        ? 'Не пропущено'
                        : 'Скрыто'}
              </span>

              <div className="flex gap-2">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="border border-line px-4 py-2 text-sm transition-colors hover:bg-sand"
                >
                  Изменить
                </Link>

                {/* Пока работу не проверили, кнопка «Показать» ничего не даст —
                    нажатие вернуло бы её в то же «на проверке» и выглядело
                    бы как поломка. Поэтому у таких работ её нет. */}
                {product.status !== 'pending' && (
                  <form action={toggleProductStatus}>
                    <input type="hidden" name="id" value={product.id} />
                    <input
                      type="hidden"
                      name="next_status"
                      value={product.status === 'active' ? 'hidden' : 'active'}
                    />
                    <button
                      type="submit"
                      className="border border-line px-4 py-2 text-sm transition-colors hover:bg-sand"
                    >
                      {product.status === 'active' ? 'Спрятать' : 'Показать'}
                    </button>
                  </form>
                )}

                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={product.id} />
                  <button
                    type="submit"
                    className="border border-line px-4 py-2 text-sm text-text-muted transition-colors hover:border-[#b91c1c] hover:text-status-error"
                  >
                    Удалить
                  </button>
                </form>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
