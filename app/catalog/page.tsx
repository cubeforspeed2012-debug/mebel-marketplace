import Link from 'next/link'
import { ProductCard } from '@/components/product-card'
import { DISTRICTS, FALLBACK_CATEGORIES, PRODUCT_TYPES } from '@/lib/constants'
import { districtIn } from '@/lib/i18n'
import { getDictionary } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import type { Category, ProductCard as ProductCardType } from '@/lib/types'

export const revalidate = 60

type SearchParams = {
  q?: string
  category?: string
  type?: string
  district?: string
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { category, type } = await searchParams
  const categoryName = FALLBACK_CATEGORIES.find((c) => c.slug === category)?.name
  const typeName = type === 'custom_order' ? 'на заказ' : type === 'ready_made' ? 'готовая' : ''
  const title = [categoryName ?? 'Мебель', typeName, 'в Ташкенте'].filter(Boolean).join(' ')

  return {
    title,
    description: `${title} — каталог мастеров и фабрик. Фото работ, цены, прямые телефоны.`,
  }
}

async function getCatalog(params: SearchParams) {
  try {
    const supabase = await createClient()

    const { data: categories } = await supabase
      .from('categories')
      .select('id, slug, name, name_uz, vertical, sort_order')
      .eq('vertical', 'furniture')
      .order('sort_order')

    let query = supabase
      .from('products')
      .select(
        `id, company_id, category_id, slug, title, description, type, price,
         price_from, currency, status, boosted_until, views_count, created_at,
         companies!inner (id, name, slug, district, phone_public, work_type),
         product_images (id, product_id, url, sort_order),
         categories (id, name, slug)`,
      )
      .eq('status', 'active')

    if (params.q) query = query.ilike('title', `%${params.q}%`)
    if (params.type && params.type in PRODUCT_TYPES) query = query.eq('type', params.type)

    if (params.category) {
      const matched = (categories ?? []).find((c) => c.slug === params.category)
      if (matched) query = query.eq('category_id', matched.id)
    }

    if (params.district) query = query.eq('companies.district', params.district)

    // Оплаченный буст поднимает товар наверх — так работает продвижение.
    const { data: products } = await query
      .order('boosted_until', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(60)

    return {
      categories: (categories ?? []) as Category[],
      products: (products ?? []) as unknown as ProductCardType[],
    }
  } catch {
    return { categories: [] as Category[], products: [] as ProductCardType[] }
  }
}

/** Ссылка-фильтр: сохраняет остальные фильтры, переключает свой. */
function filterHref(current: SearchParams, key: keyof SearchParams, value?: string) {
  const next = { ...current }
  if (!value || current[key] === value) delete next[key]
  else next[key] = value

  const query = new URLSearchParams(
    Object.entries(next).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString()

  return query ? `/catalog?${query}` : '/catalog'
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`press rounded-[var(--radius)] border px-4 py-2 text-sm transition-colors duration-200 ${
        active
          ? 'border-ink bg-ink font-semibold text-on-dark'
          : 'border-line bg-paper text-text-muted hover:border-gold hover:text-gold'
      }`}
    >
      {children}
    </Link>
  )
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const dict = await getDictionary()
  const { categories, products } = await getCatalog(params)

  const categoryList = categories.length
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
      <div className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="display gold-rule text-3xl text-text">{dict.catalog.title}</h1>

          <form action="/catalog" className="mt-7 flex max-w-lg gap-2">
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder={dict.catalog.searchPlaceholder}
              aria-label={dict.catalog.searchPlaceholder}
              className="min-w-0 flex-1 rounded-[var(--radius)] border border-line bg-paper px-4 py-2.5 outline-none transition-colors focus:border-gold"
            />
            {params.category && <input type="hidden" name="category" value={params.category} />}
            {params.type && <input type="hidden" name="type" value={params.type} />}
            {params.district && <input type="hidden" name="district" value={params.district} />}
            <button
              type="submit"
              className="press rounded-[var(--radius)] bg-gold px-6 py-2.5 font-semibold text-white transition-colors hover:bg-gold-deep"
            >
              {dict.common.search}
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Фильтры */}
        <div className="space-y-5">
          <div>
            <div className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
              {dict.catalog.category}
            </div>
            <div className="flex flex-wrap gap-2">
              {categoryList.map((category) => (
                <FilterChip
                  key={category.slug}
                  href={filterHref(params, 'category', category.slug)}
                  active={params.category === category.slug}
                >
                  {category.name}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
              {dict.catalog.type}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRODUCT_TYPES).map((value) => (
                <FilterChip
                  key={value}
                  href={filterHref(params, 'type', value)}
                  active={params.type === value}
                >
                  {dict.productTypes[value as keyof typeof PRODUCT_TYPES]}
                </FilterChip>
              ))}
            </div>
          </div>

          <details>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-text-muted hover:text-text">
              {dict.catalog.district}{' '}
              {params.district && (
                <span className="text-gold-deep">· {districtIn(dict, params.district)}</span>
              )}
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {DISTRICTS.map((district) => (
                <FilterChip
                  key={district}
                  href={filterHref(params, 'district', district)}
                  active={params.district === district}
                >
                  {districtIn(dict, district)}
                </FilterChip>
              ))}
            </div>
          </details>
        </div>

        {/* Результаты */}
        <div className="mt-12">
          {products.length > 0 ? (
            <>
              <div className="mb-5 text-sm text-text-muted">
                {dict.catalog.found}: {products.length}
              </div>
              <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[var(--radius)] border border-dashed border-line bg-paper p-14 text-center">
              <p className="text-text-muted">{dict.catalog.empty}</p>
              <Link
                href="/catalog"
                className="mt-3 inline-block font-semibold text-gold hover:underline"
              >
                {dict.catalog.reset}
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
