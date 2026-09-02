import Link from 'next/link'
import { formatPrice, PRODUCT_TYPES } from '@/lib/constants'
import { getSellerContext } from '@/lib/session'
import type { Product, ProductImage } from '@/lib/types'
import { deleteProduct, toggleProductStatus } from './actions'

export const metadata = { title: 'Моя мебель' }

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
        <h2 className="display gold-rule text-xl">Моя мебель</h2>
        <div className="mt-7 rounded-[var(--radius)] border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-text-muted">
            Сначала заполните профиль мастерской — без него мебель некуда прикрепить.
          </p>
          <Link
            href="/dashboard/company"
            className="mt-5 inline-block bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
          >
            Заполнить профиль
          </Link>
        </div>
      </div>
    )
  }

  const { data } = await supabase
    .from('products')
    .select('*, product_images (id, product_id, url, sort_order)')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  const products = (data ?? []) as unknown as Row[]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display gold-rule text-xl">Моя мебель</h2>
        <Link
          href="/dashboard/products/new"
          className="bg-gold px-6 py-2.5 font-semibold text-white transition-colors hover:bg-gold-deep"
        >
          Добавить мебель
        </Link>
      </div>

      {saved && (
        <p className="mt-6 border border-line bg-cream px-4 py-3 text-sm">Сохранено</p>
      )}

      <div className="mt-7 space-y-3">
        {products.length === 0 && (
          <div className="rounded-[var(--radius)] border border-dashed border-line bg-paper p-10 text-center">
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
              className="flex flex-wrap items-center gap-4 rounded-[var(--radius)] border border-line bg-paper p-4"
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
              </div>

              <span
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                  product.status === 'active'
                    ? 'bg-gold text-white'
                    : 'border border-line text-text-muted'
                }`}
              >
                {product.status === 'active' ? 'В каталоге' : 'Скрыто'}
              </span>

              <div className="flex gap-2">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="border border-line px-4 py-2 text-sm transition-colors hover:border-gold"
                >
                  Изменить
                </Link>

                <form action={toggleProductStatus}>
                  <input type="hidden" name="id" value={product.id} />
                  <input
                    type="hidden"
                    name="next_status"
                    value={product.status === 'active' ? 'hidden' : 'active'}
                  />
                  <button
                    type="submit"
                    className="border border-line px-4 py-2 text-sm transition-colors hover:border-gold"
                  >
                    {product.status === 'active' ? 'Спрятать' : 'Показать'}
                  </button>
                </form>

                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={product.id} />
                  <button
                    type="submit"
                    className="border border-line px-4 py-2 text-sm text-text-muted transition-colors hover:border-red-400 hover:text-red-700"
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
