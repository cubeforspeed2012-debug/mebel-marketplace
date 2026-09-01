import Link from 'next/link'
import { formatPrice, PRODUCT_TYPES } from '@/lib/constants'
import type { ProductCard as ProductCardType } from '@/lib/types'

/**
 * Карточка товара — построена как страница мебельного каталога:
 * фото на белом, под ним спецификация — что это, сколько стоит, кто делает.
 */
export function ProductCard({ product }: { product: ProductCardType }) {
  const image = product.product_images?.[0]?.url
  const company = product.companies
  const isBoosted = product.boosted_until && new Date(product.boosted_until) > new Date()

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col border border-line bg-paper transition-colors hover:border-gold"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-cream">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            Фото скоро
          </div>
        )}

        {isBoosted && (
          <span className="absolute left-0 top-4 bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ink">
            Топ
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t border-line p-4">
        {product.type && (
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
            {PRODUCT_TYPES[product.type]}
          </div>
        )}

        <h3 className="line-clamp-2 font-semibold leading-snug">{product.title}</h3>

        <div className="mt-2 font-display text-lg font-bold text-gold-deep">
          {formatPrice(product.price, product.price_from)}
        </div>

        <div className="mt-auto pt-3 text-sm text-text-muted">
          {company?.name}
          {company?.district && <span> · {company.district}</span>}
        </div>
      </div>
    </Link>
  )
}
