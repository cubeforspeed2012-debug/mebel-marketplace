import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ContactButtons } from '@/components/contact-buttons'
import { ProductCard } from '@/components/product-card'
import { RequestForm } from '@/components/request-form'
import { ShareButton } from '@/components/share-button'
import { WorksGallery, type Work } from '@/components/works-gallery'
import { PUBLIC_COMPANY_FIELDS, WORK_TYPES } from '@/lib/constants'
import { districtIn } from '@/lib/i18n'
import { getDictionary } from '@/lib/locale'
import { getFavoriteIds } from '@/lib/favorites'
import { createClient, currentUser } from '@/lib/supabase/server'
import type { Company, ProductCard as ProductCardType } from '@/lib/types'
import { bumpViews } from '@/lib/views'
import { ReviewForm } from '@/components/review-form'
import { Stars } from '@/components/stars'
import type { Review } from '@/lib/types'

export const revalidate = 300

async function getCompany(slug: string) {
  try {
    const supabase = await createClient()

    // В адресе может быть и slug («mebel-usta»), и просто id («12»).
    const isNumeric = /^\d+$/.test(slug)
    const { data: company } = await supabase
      .from('companies')
      .select(PUBLIC_COMPANY_FIELDS)
      .eq(isNumeric ? 'id' : 'slug', isNumeric ? Number(slug) : slug)
      .eq('status', 'active')
      .maybeSingle()

    if (!company) return null

    const { data: portfolio } = await supabase
      .from('portfolio_photos')
      .select('id, url')
      .eq('company_id', company.id)
      .order('sort_order')

    const { data: products } = await supabase
      .from('products')
      .select(
        `id, company_id, category_id, slug, title, description, type, price,
         price_from, currency, status, boosted_until, views_count, created_at,
         companies (id, name, slug, district, has_phone, rating_avg, rating_count, work_type),
         product_images (id, product_id, url, sort_order),
         categories (id, name, slug)`,
      )
      .eq('company_id', company.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    return {
      company: company as Company,
      portfolio: (portfolio ?? []) as { id: number; url: string }[],
      products: (products ?? []) as unknown as ProductCardType[],
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getCompany(slug)
  if (!data) return { title: 'Мастер не найден' }

  const { company } = data
  return {
    title: `${company.name} — мебель в Ташкенте`,
    description:
      company.description ??
      `${company.name}: ${
        company.work_type ? WORK_TYPES[company.work_type].toLowerCase() : 'мебель'
      } в Ташкенте${company.district ? `, ${company.district} район` : ''}. Фото работ и прямой телефон.`,
  }
}

/**
 * Отзывы о мастере и что показывать зрителю: форму, свой отзыв на правку
 * или подсказку «войдите». Владельцу форму не даём — свою мастерскую
 * оценивать нельзя, и база это тоже запрещает.
 */
async function getReviews(companyId: number) {
  try {
    const supabase = await createClient()
    const user = await currentUser()

    const [{ data: reviews }, own, owner] = await Promise.all([
      supabase
        .from('reviews')
        .select('id, company_id, user_id, rating, text, author_name, created_at')
        .eq('company_id', companyId)
        .eq('status', 'visible')
        .order('created_at', { ascending: false })
        .limit(30),
      user
        ? supabase
            .from('reviews')
            .select('rating, text')
            .eq('company_id', companyId)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase.from('companies').select('id').eq('id', companyId).eq('owner_user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    return {
      reviews: (reviews ?? []) as Review[],
      own: own.data as { rating: number; text: string | null } | null,
      signedIn: Boolean(user),
      isOwner: Boolean(owner.data),
    }
  } catch {
    return { reviews: [] as Review[], own: null, signedIn: false, isOwner: false }
  }
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const dict = await getDictionary()
  const data = await getCompany(slug)
  if (!data) notFound()

  const { company, portfolio, products } = data
  const favorites = await getFavoriteIds()

  /*
   * Сначала портфолио — то, что мастер выбрал показать в первую очередь,
   * потом фотографии из карточек товаров.
   */
  const works: Work[] = [
    ...portfolio.map((photo) => ({
      url: photo.url,
      title: company.name,
      productId: 0,
      price: null,
      priceFrom: false,
    })),
    ...products.flatMap((product) =>
    (product.product_images ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((image) => ({
        url: image.url,
        title: product.title,
        productId: product.id,
        price: product.price,
        priceFrom: product.price_from,
      })),
    ),
  ]

  // Считаем просмотр — мастер видит его у себя, площадка в статистике
  await bumpViews('company', company.id)
  const { reviews, own, signedIn, isOwner } = await getReviews(company.id)

  return (
    <>
      {/* Шапка профиля — тёмная, как витрина салона */}
      <div className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start">
          <div className="size-24 shrink-0 overflow-hidden rounded-[var(--radius)] border border-line bg-cream">
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt={company.name} className="h-full w-full object-cover" />
            ) : (
              <div className="display flex h-full items-center justify-center text-3xl text-gold">
                {company.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="display text-3xl text-text">{company.name}</h1>

            <div className="eyebrow mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              {company.work_type && <span>{dict.workTypes[company.work_type]}</span>}
              {company.district && (
                <span>
                  · {districtIn(dict, company.district)} {dict.companies.district}
                </span>
              )}
              {company.phone_verified && (
                <span className="rounded-[var(--radius)] border border-status-done px-2 py-0.5 text-status-done">
                  {dict.company.phoneVerified}
                </span>
              )}
            </div>

            <Stars
              value={Number(company.rating_avg)}
              count={company.rating_count}
              emptyLabel={dict.reviews.none}
              size="large"
              className="mt-3"
            />

            {company.description && (
              <p className="mt-5 max-w-2xl leading-relaxed text-text-muted">
                {company.description}
              </p>
            )}

            {company.address && (
              <p className="mt-3 text-sm text-text-muted">
                {dict.company.address}: {company.address}
              </p>
            )}

            {/* Позвонить или написать — в Ташкенте пользуются и тем, и другим */}
            <div className="mt-7">
              <ContactButtons
                dict={dict}
                companyId={company.id}
                hasPhone={company.has_phone}
                telegram={company.telegram}
                instagram={company.instagram}
              />
            </div>

            {/* Не дозвонились — можно оставить заявку, мастер перезвонит */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <RequestForm companyId={company.id} />
              <ShareButton title={company.name} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="display gold-rule mb-8 text-2xl">
          {dict.company.works}{' '}
          {works.length > 0 && <span className="text-text-muted">({works.length})</span>}
        </h2>

        {works.length > 0 ? (
          <WorksGallery works={works} />
        ) : products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} favorite={favorites.has(product.id)} />
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--radius)] border border-dashed border-line bg-paper p-12 text-center text-text-muted">
            {dict.company.noWorks}
          </p>
        )}

        {works.length > 0 && (
          <>
            <h2 className="display gold-rule mb-8 mt-14 text-2xl">{dict.company.canOrder}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} favorite={favorites.has(product.id)} />
              ))}
            </div>
          </>
        )}

        {/* Отзывы — то, на что покупатель смотрит перед звонком */}
        <section className="mt-14">
          <h2 className="display gold-rule mb-8 text-2xl">
            {dict.reviews.sectionTitle}{' '}
            {company.rating_count > 0 && (
              <span className="text-text-muted">({company.rating_count})</span>
            )}
          </h2>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
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
                        <span className="font-semibold text-text">{review.author_name ?? 'Покупатель'}</span>
                        <span className="text-xs text-text-muted">
                          {new Date(review.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <Stars value={review.rating} count={1} className="mt-2 [&>span:last-child]:hidden" />
                      {review.text && (
                        <p className="mt-3 leading-relaxed text-text-muted">{review.text}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              {isOwner ? (
                <p className="rounded-3xl bg-sand p-5 text-sm leading-relaxed text-text-muted">
                  {dict.reviews.ownCompany}
                </p>
              ) : signedIn ? (
                <ReviewForm companyId={company.id} initial={own} />
              ) : (
                <Link
                  href={`/auth?role=buyer&next=/company/${company.slug ?? company.id}`}
                  className="press block rounded-3xl bg-gold p-5 text-center font-semibold text-white transition-colors hover:bg-gold-deep"
                >
                  {dict.reviews.signInToReview}
                </Link>
              )}
            </div>
          </div>
        </section>

        <div className="mt-12">
          <Link href="/catalog" className="font-semibold text-gold-deep hover:underline">
            {dict.company.backToCatalog}
          </Link>
        </div>
      </div>
    </>
  )
}
