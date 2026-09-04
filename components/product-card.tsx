'use client'

import Link from 'next/link'
import { useDict } from '@/components/locale-provider'
import { districtIn, priceIn } from '@/lib/i18n'
import type { ProductCard as ProductCardType } from '@/lib/types'

/**
 * Карточка товара — как страница мебельного каталога:
 * фото на белом, под ним спецификация: что это, сколько, кто делает.
 */
export function ProductCard({ product }: { product: ProductCardType }) {
  const dict = useDict()
  const image = product.product_images?.[0]?.url
  const company = product.companies
  const isBoosted = product.boosted_until && new Date(product.boosted_until) > new Date()

  return (
    <Link
      href={`/product/${product.id}`}
      className="lift group flex flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-paper hover:border-gold"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-cream">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            {dict.common.loading}
          </div>
        )}

        {isBoosted && (
          <span className="absolute left-3 top-3 rounded-[var(--radius)] bg-gold px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-widest text-white">
            TOP
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t border-line p-4">
        {product.type && <div className="eyebrow">{dict.productTypes[product.type]}</div>}

        <h3 className="mt-1.5 line-clamp-2 font-semibold leading-snug text-text">
          {product.title}
        </h3>

        <div className="display mt-2 text-lg text-gold">
          {priceIn(dict, product.price, product.price_from)}
        </div>

        <div className="mt-auto pt-3 text-sm text-text-muted">
          {company?.name}
          {company?.district && <span> · {districtIn(dict, company.district)}</span>}
        </div>
      </div>
    </Link>
  )
}
