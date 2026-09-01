import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatPhone, formatPrice, PRODUCT_TYPES, WORK_TYPES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { ProductCard as ProductCardType } from '@/lib/types'

export const revalidate = 300

async function getProduct(id: string) {
  if (!/^\d+$/.test(id)) return null

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products')
      .select(
        `id, company_id, category_id, slug, title, description, type, price,
         price_from, currency, status, boosted_until, views_count, created_at,
         companies!inner (id, name, slug, district, phone_public, work_type),
         product_images (id, product_id, url, sort_order),
         categories (id, name, slug)`,
      )
      .eq('id', Number(id))
      .eq('status', 'active')
      .maybeSingle()

    return (data as unknown as ProductCardType) ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return { title: 'Товар не найден' }

  return {
    title: `${product.title} — ${formatPrice(product.price, product.price_from)}`,
    description:
      product.description ??
      `${product.title} от ${product.companies?.name ?? 'мастера'} в Ташкенте. ${formatPrice(
        product.price,
        product.price_from,
      )}.`,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) notFound()

  const images = [...(product.product_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  )
  const company = product.companies

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        {/* Фото работы */}
        <div className="space-y-3">
          <div className="aspect-4/3 overflow-hidden rounded-2xl bg-accent-soft">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[0].url}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                Фото скоро
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(1, 9).map((image) => (
                <div key={image.id} className="aspect-square overflow-hidden rounded-lg bg-accent-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={product.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Цена и контакт мастера */}
        <div>
          {product.categories && (
            <Link
              href={`/catalog?category=${product.categories.slug}`}
              className="text-sm text-accent hover:underline"
            >
              {product.categories.name}
            </Link>
          )}

          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
            {product.title}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-semibold text-accent">
              {formatPrice(product.price, product.price_from)}
            </span>
            {product.type && (
              <span className="rounded-md bg-accent-soft px-2.5 py-1 text-sm font-medium text-accent">
                {PRODUCT_TYPES[product.type]}
              </span>
            )}
          </div>

          {product.type === 'custom_order' && (
            <p className="mt-3 rounded-lg bg-accent-soft p-3 text-sm leading-relaxed">
              Это мебель на заказ — итоговая цена зависит от размеров и материалов.
              Позвоните мастеру и опишите, что нужно.
            </p>
          )}

          {product.description && (
            <p className="mt-6 whitespace-pre-line leading-relaxed">{product.description}</p>
          )}

          {/* Кто делает */}
          {company && (
            <div className="mt-8 rounded-xl border border-border bg-surface p-5">
              <div className="text-sm text-muted">Мастер</div>
              <Link
                href={`/company/${company.slug ?? company.id}`}
                className="mt-1 block text-lg font-medium hover:text-accent"
              >
                {company.name}
              </Link>
              <div className="mt-1 text-sm text-muted">
                {company.work_type && WORK_TYPES[company.work_type]}
                {company.district && <span> · {company.district} район</span>}
              </div>

              {company.phone_public && (
                <a
                  href={`tel:${company.phone_public.replace(/\s/g, '')}`}
                  className="mt-4 block rounded-lg bg-accent px-6 py-3 text-center font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  Позвонить {formatPhone(company.phone_public)}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10">
        <Link href="/catalog" className="text-accent hover:underline">
          ← Вернуться в каталог
        </Link>
      </div>
    </div>
  )
}
