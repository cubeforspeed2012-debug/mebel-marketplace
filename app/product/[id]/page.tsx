import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RequestForm } from '@/components/request-form'
import { ContactButtons } from '@/components/contact-buttons'
import { formatPrice } from '@/lib/constants'
import { districtIn, priceIn } from '@/lib/i18n'
import { getDictionary } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import type { ProductCard as ProductCardType } from '@/lib/types'
import { bumpViews } from '@/lib/views'

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
         companies!inner (id, name, slug, district, phone_public, work_type, telegram, instagram),
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
  const dict = await getDictionary()
  const product = await getProduct(id)
  if (!product) notFound()

  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const company = product.companies

  // Считаем просмотр товара — попадёт в статистику мастера и площадки
  await bumpViews('product', product.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        {/* Фото работы */}
        <div className="space-y-3">
          <div className="aspect-4/3 overflow-hidden rounded-[var(--radius)] border border-line bg-paper">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0].url} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-text-muted">
                Фото скоро
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(1, 9).map((image) => (
                <div key={image.id} className="aspect-square overflow-hidden rounded-[var(--radius)] border border-line bg-paper">
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

        {/* Спецификация: что это, сколько стоит, кому звонить */}
        <div>
          <div className="flex flex-wrap items-center gap-x-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
            {product.categories && (
              <Link
                href={`/catalog?category=${product.categories.slug}`}
                className="hover:text-gold-deep"
              >
                {product.categories.name}
              </Link>
            )}
            {product.type && <span>· {dict.productTypes[product.type]}</span>}
          </div>

          <h1 className="display mt-3 text-2xl leading-tight sm:text-3xl">{product.title}</h1>

          <div className="mt-5 border-y border-line py-5">
            <div className="display text-3xl text-gold-deep">
              {priceIn(dict, product.price, product.price_from)}
            </div>
            {product.type === 'custom_order' && (
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {dict.product.customNote}
              </p>
            )}
          </div>

          {product.description && (
            <p className="mt-6 whitespace-pre-line leading-relaxed">{product.description}</p>
          )}

          {company && (
            <div className="mt-8 rounded-[var(--radius)] border border-line bg-paper p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                {dict.product.master}
              </div>
              <Link
                href={`/company/${company.slug ?? company.id}`}
                className="mt-2 block text-lg font-semibold hover:text-gold-deep"
              >
                {company.name}
              </Link>
              <div className="mt-1 text-sm text-text-muted">
                {company.work_type && dict.workTypes[company.work_type]}
                {company.district && (
                  <span>
                    {' · '}
                    {districtIn(dict, company.district)} {dict.companies.district}
                  </span>
                )}
              </div>

              <div className="mt-5">
                <ContactButtons
                  dict={dict}
                  phone={company.phone_public}
                  telegram={company.telegram}
                  instagram={company.instagram}
                  size="small"
                />
              </div>

              <div className="mt-3">
                <RequestForm companyId={company.id} productId={product.id} compact />
              </div>
            </div>
          )}

          <p className="mt-6 text-xs leading-relaxed text-text-muted">
            {dict.product.disclaimer}{' '}
            <Link href="/terms" className="underline hover:text-gold-deep">
              {dict.product.terms}
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-12">
        <Link href="/catalog" className="font-semibold text-gold-deep hover:underline">
          ← Вернуться в каталог
        </Link>
      </div>
    </div>
  )
}
