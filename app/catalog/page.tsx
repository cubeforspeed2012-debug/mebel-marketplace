import Link from 'next/link'
import { ProductCard } from '@/components/product-card'
import { DISTRICTS, FALLBACK_CATEGORIES, PRODUCT_TYPES } from '@/lib/constants'
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

    if (params.q) {
      query = query.ilike('title', `%${params.q}%`)
    }

    if (params.type && params.type in PRODUCT_TYPES) {
      query = query.eq('type', params.type)
    }

    if (params.category) {
      const matched = (categories ?? []).find((c) => c.slug === params.category)
      if (matched) query = query.eq('category_id', matched.id)
    }

    if (params.district) {
      query = query.eq('companies.district', params.district)
    }

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

/** Ссылка-фильтр: сохраняет остальные выбранные фильтры, переключает свой. */
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
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        active
          ? 'border-accent bg-accent text-white'
          : 'border-border bg-surface hover:border-accent hover:text-accent'
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
  const { categories, products } = await getCatalog(params)

  const categoryList = categories.length
    ? categories.map((c) => ({ slug: c.slug ?? String(c.id), name: c.name }))
    : FALLBACK_CATEGORIES

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Каталог мебели</h1>

      <form action="/catalog" className="mt-6 flex max-w-xl gap-2">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Поиск по каталогу"
          aria-label="Поиск по каталогу"
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 outline-none transition-colors focus:border-accent"
        />
        {params.category && <input type="hidden" name="category" value={params.category} />}
        {params.type && <input type="hidden" name="type" value={params.type} />}
        {params.district && <input type="hidden" name="district" value={params.district} />}
        <button
          type="submit"
          className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Найти
        </button>
      </form>

      {/* Фильтры */}
      <div className="mt-8 space-y-4">
        <div>
          <div className="mb-2 text-sm font-medium text-muted">Категория</div>
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
          <div className="mb-2 text-sm font-medium text-muted">Тип</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRODUCT_TYPES).map(([value, label]) => (
              <FilterChip
                key={value}
                href={filterHref(params, 'type', value)}
                active={params.type === value}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
            Район {params.district && <span className="text-accent">· {params.district}</span>}
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {DISTRICTS.map((district) => (
              <FilterChip
                key={district}
                href={filterHref(params, 'district', district)}
                active={params.district === district}
              >
                {district}
              </FilterChip>
            ))}
          </div>
        </details>
      </div>

      {/* Результаты */}
      <div className="mt-10">
        {products.length > 0 ? (
          <>
            <div className="mb-5 text-sm text-muted">Найдено: {products.length}</div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted">
              По этому запросу пока ничего нет.
            </p>
            <Link href="/catalog" className="mt-3 inline-block font-medium text-accent hover:underline">
              Сбросить фильтры
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
