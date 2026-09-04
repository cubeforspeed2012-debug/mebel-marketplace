import Link from 'next/link'
import { ProductCard } from '@/components/product-card'
import { FALLBACK_CATEGORIES } from '@/lib/constants'
import { getDictionary } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import type { Category, ProductCard as ProductCardType } from '@/lib/types'

export const revalidate = 300

async function getHomeData() {
  try {
    const supabase = await createClient()

    const [categoriesResult, productsResult] = await Promise.all([
      supabase
        .from('categories')
        .select('id, slug, name, name_uz, vertical, sort_order')
        .eq('vertical', 'furniture')
        .order('sort_order'),
      supabase
        .from('products')
        .select(
          `id, company_id, category_id, slug, title, description, type, price,
           price_from, currency, status, boosted_until, views_count, created_at,
           companies!inner (id, name, slug, district, phone_public, work_type),
           product_images (id, product_id, url, sort_order),
           categories (id, name, slug)`,
        )
        .eq('status', 'active')
        .order('boosted_until', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    return {
      categories: (categoriesResult.data ?? []) as Category[],
      products: (productsResult.data ?? []) as unknown as ProductCardType[],
    }
  } catch {
    return { categories: [] as Category[], products: [] as ProductCardType[] }
  }
}

/** Вошёл человек или нет — от этого зависит, звать ли его регистрироваться. */
async function isSignedIn() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return Boolean(user)
  } catch {
    return false
  }
}

export default async function HomePage() {
  const dict = await getDictionary()
  const signedIn = await isSignedIn()
  const { categories, products } = await getHomeData()

  // Названия категорий в базе лежат на двух языках — берём по языку страницы
  const categoryLinks = categories.length
    ? categories.map((c) => ({
        slug: c.slug ?? String(c.id),
        name: (dict.code === 'uz' ? c.name_uz : c.name) ?? c.name,
      }))
    : FALLBACK_CATEGORIES.map((c) => ({
        slug: c.slug,
        name: (dict.categories as Record<string, string>)[c.slug] ?? c.name,
      }))

  return (
    <>
      {/* Наверху — поиск и категории. Дальше сразу мебель: люди пришли смотреть
          работы мастеров, а не читать про площадку. */}
      <section className="border-b border-line bg-ink">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
          <form action="/catalog" className="flex gap-2">
            <input
              type="search"
              name="q"
              placeholder={dict.home.searchPlaceholder}
              aria-label={dict.home.searchLabel}
              className="min-w-0 flex-1 rounded-full bg-paper px-5 py-3.5 text-on-dark outline-none transition-shadow duration-200 focus:shadow-[0_0_0_2px_var(--gold)]"
            />
            <button
              type="submit"
              className="press shrink-0 rounded-full bg-gold px-6 py-3.5 font-semibold text-white transition-colors duration-200 hover:bg-gold-deep"
            >
              {dict.common.search}
            </button>
          </form>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoryLinks.map((category) => (
              <Link
                key={category.slug}
                href={`/catalog?category=${category.slug}`}
                className="press shrink-0 rounded-full bg-paper px-5 py-2.5 text-sm text-on-dark-muted transition-colors duration-200 hover:text-gold"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Мебель мастеров — главное, ради чего человек открыл площадку */}
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <h1 className="display text-2xl text-text">{dict.home.freshTitle}</h1>
          <Link href="/catalog" className="text-sm font-semibold text-gold hover:underline">
            {dict.home.allCatalog}
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-paper p-12 text-center">
            <p className="text-text-muted">{dict.home.empty}</p>
            <Link
              href="/dashboard"
              className="press mt-5 inline-block rounded-full bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
            >
              {dict.home.emptyAction}
            </Link>
          </div>
        )}
      </section>

      {/* Две большие двери: купить мебель или стать мастером.
          Вошедшему это не нужно — он уже внутри, и звать его некуда. */}
      {!signedIn && (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <div className="stagger grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] bg-paper p-7 sm:p-9">
              <div className="eyebrow text-gold">{dict.home.buyers}</div>
              <h2 className="display mt-4 text-2xl leading-tight text-text sm:text-3xl">
                {dict.banner.buyerTitle}
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-text-muted">
                {dict.banner.buyerText}
              </p>
              <Link
                href="/auth?role=buyer"
                className="press mt-7 block rounded-full bg-gold px-8 py-4 text-center font-semibold text-white transition-colors hover:bg-gold-deep sm:inline-block"
              >
                {dict.banner.buyerAction}
              </Link>
              <p className="mt-3 text-xs text-text-muted">{dict.banner.buyerNote}</p>
            </div>

            <div className="rounded-[28px] bg-ink p-7 sm:p-9">
              <div className="eyebrow text-gold">{dict.home.masters}</div>
              <h2 className="display mt-4 text-2xl leading-tight text-on-dark sm:text-3xl">
                {dict.banner.sellerTitle}
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-on-dark-muted">
                {dict.banner.sellerText}
              </p>
              <Link
                href="/auth"
                className="press mt-7 block rounded-full bg-gold px-8 py-4 text-center font-semibold text-white transition-colors hover:bg-gold-deep sm:inline-block"
              >
                {dict.banner.sellerAction}
              </Link>
              <p className="mt-3 text-xs text-on-dark-muted">{dict.banner.sellerNote}</p>
            </div>
          </div>
        </section>
      )}

      {/* Главная развилка покупателя */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="stagger grid gap-4 sm:grid-cols-2">
          <Link
            href="/catalog?type=ready_made"
            className="lift rounded-[var(--radius)] border border-line bg-paper p-8"
          >
            <h2 className="display gold-rule text-xl text-text">{dict.home.readyTitle}</h2>
            <p className="mt-5 leading-relaxed text-text-muted">
              {dict.home.readyText}
            </p>
            <span className="mt-6 inline-block font-semibold text-gold">
              {dict.home.readyLink}
            </span>
          </Link>

          <Link
            href="/catalog?type=custom_order"
            className="lift rounded-[var(--radius)] border border-line bg-paper p-8"
          >
            <h2 className="display gold-rule text-xl text-text">{dict.home.customTitle}</h2>
            <p className="mt-5 leading-relaxed text-text-muted">
              {dict.home.customText}
            </p>
            <span className="mt-6 inline-block font-semibold text-gold">{dict.home.customLink}</span>
          </Link>
        </div>
      </section>

      {/* Две стороны площадки */}
      <section className={signedIn ? 'hidden' : 'bg-ink'}>
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-line-dark p-8">
              <div className="eyebrow text-gold">{dict.home.buyers}</div>
              <h2 className="display mt-3 text-xl text-on-dark sm:text-2xl">{dict.home.buyTitle}</h2>
              <p className="mt-4 leading-relaxed text-on-dark-muted">
                {dict.home.buyText}
              </p>
              <Link
                href="/auth?role=buyer"
                className="press mt-6 inline-block rounded-[var(--radius)] bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
              >
                {dict.home.buyAction}
              </Link>
              <p className="mt-4 text-sm text-on-dark-muted">
                {dict.home.buyNoteStart}{' '}
                <Link href="/catalog" className="text-gold hover:underline">
                  {dict.home.buyNoteLink}
                </Link>{' '}
                {dict.home.buyNoteEnd}
              </p>
            </div>

            <div className="rounded-[var(--radius)] border border-line-dark p-8">
              <div className="eyebrow text-gold">{dict.home.masters}</div>
              <h2 className="display mt-3 text-xl text-on-dark sm:text-2xl">
                {dict.home.sellTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-on-dark-muted">
                {dict.home.sellText}
              </p>
              <Link
                href="/auth"
                className="press mt-6 inline-block rounded-[var(--radius)] bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
              >
                {dict.home.sellAction}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
