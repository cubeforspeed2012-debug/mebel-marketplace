import Link from 'next/link'
import { formatPrice, PRODUCT_TYPES } from '@/lib/constants'
import type { ProductCard as ProductCardType } from '@/lib/types'

/**
 * Карточка товара в каталоге. Фото + цена + кто делает + район.
 * Всё, что нужно покупателю, чтобы решить — звонить или листать дальше.
 */
export function ProductCard({ product }: { product: ProductCardType }) {
  const image = product.product_images?.[0]?.url
  const company = product.companies
  const isBoosted =
    product.boosted_until && new Date(product.boosted_until) > new Date()

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-accent-soft">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Фото скоро
          </div>
        )}

        {isBoosted && (
          <span className="absolute left-3 top-3 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white">
            Топ
          </span>
        )}

        {product.type && (
          <span className="absolute right-3 top-3 rounded-md bg-surface/95 px-2 py-1 text-xs font-medium">
            {PRODUCT_TYPES[product.type]}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 font-medium leading-snug">{product.title}</h3>

        <div className="mt-1 text-lg font-semibold text-accent">
          {formatPrice(product.price, product.price_from)}
        </div>

        <div className="mt-auto pt-3 text-sm text-muted">
          {company?.name}
          {company?.district && <span> · {company.district} р-н</span>}
        </div>
      </div>
    </Link>
  )
}
