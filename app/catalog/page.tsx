import Link from 'next/link'
import { CategoryIcon, FurnitureScene } from '@/components/furniture-icons'
import { ProductCard } from '@/components/product-card'
import { CHOICE_GROUPS, SORTS, relevance, searchWords, type ChoiceKey, type SortKey } from '@/lib/attributes'
import { DISTRICTS, FALLBACK_CATEGORIES, PRODUCT_TYPES } from '@/lib/constants'
import { districtIn } from '@/lib/i18n'
import { getDictionary } from '@/lib/locale'
import { getFavoriteIds } from '@/lib/favorites'
import { createClient } from '@/lib/supabase/server'
import type { Category, ProductCard as ProductCardType } from '@/lib/types'

export const revalidate = 60

type SearchParams = {
  q?: string
  category?: string
  type?: string
  district?: string
  room?: string
  material?: string
  style?: string
  color?: string
  price_min?: string
  price_max?: string
  sort?: string
}

const CHOICE_KEYS = Object.keys(CHOICE_GROUPS) as ChoiceKey[]

const toNumber = (raw?: string) => {
  const n = Number(String(raw ?? '').replace(/\D/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
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

    const words = searchWords(params.q)

    /*
     * Каталог: сначала фильтры — категория, тип, район, характеристики,
     * цена. Они работают как полки: сужают витрину до нужного.
     */
    const build = () => {
      let query = supabase
        .from('products')
        .select(
          `id, company_id, category_id, slug, title, description, type, price,
           price_from, currency, status, boosted_until, views_count, created_at,
           companies!inner (id, name, slug, district, has_phone, rating_avg, rating_count, work_type),
           product_images (id, product_id, url, sort_order),
           categories (id, name, slug), attributes, search_text`,
        )
        .eq('status', 'active')

      if (params.type && params.type in PRODUCT_TYPES) query = query.eq('type', params.type)

      if (params.category) {
        const matched = (categories ?? []).find((c) => c.slug === params.category)
        if (matched) query = query.eq('category_id', matched.id)
      }

      if (params.district) query = query.eq('companies.district', params.district)

      // Характеристики лежат в jsonb — фильтруем по ключу внутри него
      for (const key of CHOICE_KEYS) {
        const value = params[key]
        if (value && CHOICE_GROUPS[key].options.some((o) => o.key === value)) {
          query = query.eq(`attributes->>${key}`, value)
        }
      }

      const min = toNumber(params.price_min)
      const max = toNumber(params.price_max)
      if (min) query = query.gte('price', min)
      if (max) query = query.lte('price', max)

      // Оплаченный буст поднимает товар наверх — так работает продвижение.
      query = query.order('boosted_until', { ascending: false, nullsFirst: false })
      switch (params.sort as SortKey | undefined) {
        case 'cheap': query = query.order('price', { ascending: true, nullsFirst: false }); break
        case 'expensive': query = query.order('price', { ascending: false, nullsFirst: false }); break
        case 'popular': query = query.order('views_count', { ascending: false }); break
        default: query = query.order('created_at', { ascending: false })
      }
      return query
    }

    type Row = ProductCardType & { search_text?: string | null }
    let products: Row[] = []

    if (!words.length) {
      const { data } = await build().limit(60)
      products = (data ?? []) as unknown as Row[]
    } else {
      /*
       * Поиск — по индексу search_text, который собирает база: название,
       * описание, категория, тип, мастерская, характеристики. Сначала
       * ищем работы, где нашлись все слова. Если таких нет — где нашлось
       * хоть одно: пустой экран на запрос «кухня лофт» хуже, чем просто
       * кухни, пусть и не лофт.
       */
      let strict = build()
      for (const w of words) strict = strict.ilike('search_text', `%${w}%`)
      const { data: exact } = await strict.limit(200)
      let rows = (exact ?? []) as unknown as Row[]

      if (!rows.length) {
        const any = words.map((w) => `search_text.ilike.*${w}*`).join(',')
        const { data: loose } = await build().or(any).limit(200)
        rows = (loose ?? []) as unknown as Row[]
      }

      // Ранжирование: совпадение в названии выше, чем в описании.
      // Если человек сам выбрал сортировку по цене — уважаем её.
      if (!params.sort || params.sort === 'new') {
        rows = rows
          .map((row, index) => ({
            row,
            index,
            score: relevance(words, { title: row.title, category: row.categories?.name, searchText: row.search_text }),
          }))
          .sort((a, b) => b.score - a.score || a.index - b.index)
          .map((x) => x.row)
      }
      products = rows.slice(0, 60)
    }

    return {
      categories: (categories ?? []) as Category[],
      products: products as ProductCardType[],
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
          ? 'border-gold bg-gold font-semibold text-white'
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
  const lang = dict.code === 'uz' ? 'uz' : 'ru'
  const { categories, products } = await getCatalog(params)
  const favorites = await getFavoriteIds()

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
            {CHOICE_KEYS.map((k) => params[k] && <input key={k} type="hidden" name={k} value={params[k]} />)}
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
                  <span className="inline-flex items-center gap-2">
                    <CategoryIcon slug={category.slug} className="size-4" />
                    {category.name}
                  </span>
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

          {/* Характеристики: комната, материал, стиль, цвет. Свёрнуты, чтобы
              не пугать длиной, но открытый фильтр показывает выбранное. */}
          {CHOICE_KEYS.map((key) => {
            const group = CHOICE_GROUPS[key]
            const picked = group.options.find((o) => o.key === params[key])
            return (
              <details key={key} open={Boolean(picked)}>
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-text-muted hover:text-text">
                  {group[lang]}{' '}
                  {picked && <span className="text-gold-deep">· {picked[lang]}</span>}
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.options.map((option) => (
                    <FilterChip
                      key={option.key}
                      href={filterHref(params, key, option.key)}
                      active={params[key] === option.key}
                    >
                      {option[lang]}
                    </FilterChip>
                  ))}
                </div>
              </details>
            )
          })}

          {/* Цена и сортировка — одной строкой, отправляется кнопкой */}
          <form action="/catalog" className="flex flex-wrap items-end gap-2">
            {Object.entries(params)
              .filter(([k, v]) => v && !['price_min', 'price_max', 'sort'].includes(k))
              .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
                {lang === 'uz' ? 'Narx, so‘m' : 'Цена, сум'}
              </span>
              <span className="flex gap-2">
                <input name="price_min" inputMode="numeric" defaultValue={params.price_min ?? ''} placeholder={lang === 'uz' ? 'dan' : 'от'} className="w-28 rounded-[var(--radius)] border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-gold" />
                <input name="price_max" inputMode="numeric" defaultValue={params.price_max ?? ''} placeholder={lang === 'uz' ? 'gacha' : 'до'} className="w-32 rounded-[var(--radius)] border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-gold" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
                {lang === 'uz' ? 'Saralash' : 'Сортировка'}
              </span>
              <select name="sort" defaultValue={params.sort ?? 'new'} className="rounded-[var(--radius)] border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-gold">
                {(Object.keys(SORTS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>{SORTS[k][lang]}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="press rounded-[var(--radius)] border border-line bg-paper px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-gold hover:text-gold">
              {lang === 'uz' ? 'Qo‘llash' : 'Применить'}
            </button>
          </form>
        </div>

        {/* Результаты */}
        <div className="mt-12">
          {products.length > 0 ? (
            <>
              <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                key={product.id}
                product={product}
                favorite={favorites.has(product.id)}
              />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[var(--radius)] border border-dashed border-line bg-paper p-14 text-center">
              <FurnitureScene className="mx-auto h-28 w-auto text-text-muted opacity-70" />
              <p className="mt-5 text-text-muted">{dict.catalog.empty}</p>
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
