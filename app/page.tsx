import Link from 'next/link'
import { ProductCard } from '@/components/product-card'
import { FALLBACK_CATEGORIES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { Category, ProductCard as ProductCardType } from '@/lib/types'

// Главная обновляется раз в 5 минут — быстро для посетителей, свежо для каталога.
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
        .limit(8),
    ])

    return {
      categories: (categoriesResult.data ?? []) as Category[],
      products: (productsResult.data ?? []) as unknown as ProductCardType[],
    }
  } catch {
    // База спит или недоступна — страница всё равно должна открыться.
    return { categories: [] as Category[], products: [] as ProductCardType[] }
  }
}

export default async function HomePage() {
  const { categories, products } = await getHomeData()
  const categoryLinks = categories.length
    ? categories.map((c) => ({ slug: c.slug ?? String(c.id), name: c.name }))
    : FALLBACK_CATEGORIES

  return (
    <>
      {/* Первый экран: одна понятная задача — найти мебель */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Вся мебель Ташкента <span className="text-accent">в одном месте</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
            Готовая мебель и мебель на заказ от мастеров и фабрик города.
            Сравните работы, цены и звоните напрямую — без посредников и наценок.
          </p>

          <form action="/catalog" className="mt-8 flex max-w-xl gap-2">
            <input
              type="search"
              name="q"
              placeholder="Что ищете? Например: кухня на заказ"
              aria-label="Поиск мебели"
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Найти
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            {categoryLinks.map((category) => (
              <Link
                key={category.slug}
                href={`/catalog?category=${category.slug}`}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Две дороги: готовое или на заказ — это главный выбор покупателя мебели */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2">
        <Link
          href="/catalog?type=ready_made"
          className="rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-md"
        >
          <h2 className="text-xl font-semibold">Готовая мебель</h2>
          <p className="mt-2 leading-relaxed text-muted">
            То, что можно купить и забрать сейчас. Цены и фото — сразу в каталоге.
          </p>
          <span className="mt-4 inline-block font-medium text-accent">
            Смотреть каталог →
          </span>
        </Link>

        <Link
          href="/catalog?type=custom_order"
          className="rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-md"
        >
          <h2 className="text-xl font-semibold">Мебель на заказ</h2>
          <p className="mt-2 leading-relaxed text-muted">
            Своя идея, свои размеры. Найдите мастера, который делает именно то,
            что вам нужно.
          </p>
          <span className="mt-4 inline-block font-medium text-accent">
            Найти мастера →
          </span>
        </Link>
      </section>

      {/* Свежие работы */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Новые работы</h2>
          <Link href="/catalog" className="text-sm font-medium text-accent hover:underline">
            Весь каталог →
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-muted">
              Каталог пока пуст — мы только запускаемся.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Разместить свою мебель первым
            </Link>
          </div>
        )}
      </section>

      {/* Приглашение для мебельщиков — вторая половина маркетплейса */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl bg-foreground px-6 py-12 text-background sm:px-12">
          <h2 className="max-w-2xl text-2xl font-semibold sm:text-3xl">
            Делаете мебель? Вас найдут здесь
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed opacity-80">
            Разместите работы, укажите телефон — и получайте звонки от клиентов,
            которые ищут именно вашу мебель. Регистрация бесплатная.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Разместить мебель
          </Link>
        </div>
      </section>
    </>
  )
}
