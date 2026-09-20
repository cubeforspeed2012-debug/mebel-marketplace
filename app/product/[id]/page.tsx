import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RequestForm } from '@/components/request-form'
import { ContactButtons } from '@/components/contact-buttons'
import { FavoriteButton } from '@/components/favorite-button'
import { ProductCard } from '@/components/product-card'
import { Stars } from '@/components/stars'
import { formatPrice } from '@/lib/constants'
import { districtIn, priceIn } from '@/lib/i18n'
import { getDictionary } from '@/lib/locale'
import { getFavoriteIds } from '@/lib/favorites'
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
         companies!inner (id, name, slug, district, has_phone, rating_avg, rating_count, work_type, telegram, instagram),
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

/**
 * Мастер целиком и его другие работы. Человек нажал на одну кухню —
 * ему нужно сразу понять, кто её сделал и что ещё умеет.
 */
async function getMaster(companyId: number, excludeProductId: number) {
  try {
    const supabase = await createClient()

    const [companyResult, othersResult, countResult, reviewsResult] = await Promise.all([
      supabase
        .from('companies')
        .select('id, name, slug, district, work_type, description, logo_url, created_at')
        .eq('id', companyId)
        .maybeSingle(),
      supabase
        .from('products')
        .select(
          `id, company_id, category_id, slug, title, description, type, price,
           price_from, currency, status, boosted_until, views_count, created_at,
           companies (id, name, slug, district, has_phone, rating_avg, rating_count, work_type),
           product_images (id, product_id, url, sort_order),
           categories (id, name, slug)`,
        )
        .eq('company_id', companyId)
        .eq('status', 'active')
        .neq('id', excludeProductId)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'active'),
      // Отзывы о мастере — их читают перед тем, как решиться позвонить,
      // поэтому показываем прямо здесь, а не только на странице мастерской
      supabase
        .from('reviews')
        .select('id, rating, text, author_name, created_at')
        .eq('company_id', companyId)
        .eq('status', 'visible')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    return {
      master: companyResult.data,
      others: (othersResult.data ?? []) as unknown as ProductCardType[],
      worksCount: countResult.count ?? 0,
      reviews: (reviewsResult.data ?? []) as Review[],
    }
  } catch {
    return { master: null, others: [] as ProductCardType[], worksCount: 0, reviews: [] as Review[] }
  }
}

type Review = {
  id: number
  rating: number
  text: string | null
  author_name: string | null
  created_at: string
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
  const favorites = await getFavoriteIds()
  const { master, others, worksCount, reviews } = company
    ? await getMaster(company.id, product.id)
    : { master: null, others: [], worksCount: 0, reviews: [] as Review[] }

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

          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="display text-2xl leading-tight sm:text-3xl">{product.title}</h1>
            <FavoriteButton
              productId={product.id}
              active={favorites.has(product.id)}
              size="large"
            />
          </div>

          {/*
            Оценка сразу под названием — так её ищут глазами на любой
            площадке. И это ссылка: человек, увидевший «12 отзывов»,
            хочет их прочитать, а не искать по странице.
          */}
          {company && (
            <a href="#otzyvy" className="mt-2 inline-flex items-center gap-2 hover:opacity-80">
              <Stars
                value={Number(company.rating_avg)}
                count={company.rating_count}
                emptyLabel={dict.reviews.none}
              />
              {company.rating_count > 0 && (
                <span className="text-sm text-text-muted underline">
                  {dict.reviews.sectionTitle.toLowerCase()}
                </span>
              )}
            </a>
          )}

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

              {/* Кто сделал: лицо мастерской, а не одна строка с названием */}
              <Link
                href={`/company/${company.slug ?? company.id}`}
                className="mt-3 flex items-center gap-4"
              >
                <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream text-xl font-semibold text-gold">
                  {master?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={master.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    company.name.charAt(0)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold hover:text-gold-deep">
                    {company.name}
                  </span>
                  <span className="block text-sm text-text-muted">
                    {company.work_type && dict.workTypes[company.work_type]}
                    {company.district && (
                      <>
                        {' · '}
                        {districtIn(dict, company.district)} {dict.companies.district}
                      </>
                    )}
                  </span>
                  {worksCount > 0 && (
                    <span className="mt-0.5 block text-xs text-gold">
                      {worksCount} {dict.product.worksCount}
                    </span>
                  )}
                  <span className="mt-1 block">
                    <Stars
                      value={Number(company.rating_avg)}
                      count={company.rating_count}
                      size="small"
                      emptyLabel={dict.reviews.none}
                    />
                  </span>
                </span>
              </Link>

              {master?.description && (
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-text-muted">
                  {master.description}
                </p>
              )}

              <div className="mt-5">
                <ContactButtons
                  dict={dict}
                  companyId={company.id}
                  hasPhone={company.has_phone}
                  productId={product.id}
                  telegram={company.telegram}
                  instagram={company.instagram}
                  size="small"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <RequestForm companyId={company.id} productId={product.id} compact />
              </div>

              <Link
                href={`/company/${company.slug ?? company.id}`}
                className="press mt-4 block rounded-full bg-sand px-5 py-3 text-center text-sm font-semibold text-text transition-colors hover:bg-gold hover:text-white"
              >
                {dict.product.portfolio} →
              </Link>
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

      {/* Другие работы того же мастера — чтобы не уходить в каталог за сравнением */}
      {others.length > 0 && company && (
        <section className="mt-14">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="display gold-rule text-2xl text-text">{dict.product.similar}</h2>
            <Link
              href={`/company/${company.slug ?? company.id}`}
              className="text-sm font-semibold text-gold hover:underline"
            >
              {dict.product.portfolio} →
            </Link>
          </div>
          <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {others.map((item) => (
              <ProductCard key={item.id} product={item} favorite={favorites.has(item.id)} />
            ))}
          </div>
        </section>
      )}

      {/*
        Отзывы о мастере — на странице работы, а не только у мастерской.
        Решение «звонить или нет» человек принимает здесь, глядя на эту
        кухню, и уходить за отзывами на другую страницу он не станет.
      */}
      {company && (
        <section id="otzyvy" className="mt-14 scroll-mt-20">
          <h2 className="display gold-rule mb-6 text-2xl text-text">
            {dict.reviews.sectionTitle}{' '}
            {company.rating_count > 0 && (
              <span className="text-text-muted">({company.rating_count})</span>
            )}
          </h2>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              {reviews.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-line bg-paper p-8 text-center text-text-muted">
                  {dict.reviews.empty}
                </p>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((review) => (
                    <li key={review.id} className="rounded-3xl bg-paper p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-text">
                          {review.author_name ?? 'Покупатель'}
                        </span>
                        <span className="text-xs text-text-muted">
                          {new Date(review.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <Stars
                        value={review.rating}
                        count={1}
                        className="mt-2 [&>span:last-child]:hidden"
                      />
                      {review.text && (
                        <p className="mt-3 leading-relaxed text-text-muted">{review.text}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Оценку ставят мастерской целиком, поэтому и форма живёт у неё */}
            <div className="rounded-3xl bg-paper p-5">
              <div className="flex items-baseline gap-3">
                <span className="display text-4xl text-text">
                  {company.rating_count > 0 ? Number(company.rating_avg).toFixed(1) : '—'}
                </span>
                <Stars
                  value={Number(company.rating_avg)}
                  count={company.rating_count}
                  emptyLabel={dict.reviews.none}
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Оценка складывается из отзывов обо всех работах мастерской.
              </p>
              <Link
                href={`/company/${company.slug ?? company.id}#otzyvy`}
                className="press mt-4 block rounded-full bg-sand px-5 py-3 text-center text-sm font-semibold text-text transition-colors hover:bg-gold hover:text-white"
              >
                {reviews.length === 0 ? 'Оставить отзыв' : 'Все отзывы и оценка'}
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="mt-12">
        <Link href="/catalog" className="font-semibold text-gold-deep hover:underline">
          {dict.company.backToCatalog}
        </Link>
      </div>
    </div>
  )
}
