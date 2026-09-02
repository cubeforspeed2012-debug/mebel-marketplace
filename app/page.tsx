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
      {/* Первый экран. Тёмный, с мягким световым пятном и золотой рамкой —
          как витрина мебельного салона: сначала свет, потом товар. */}
      <section className="relative overflow-hidden bg-ink">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 60% at 50% 20%, rgba(217,164,65,0.18) 0%, rgba(22,33,28,0) 70%)',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="border border-gold/30 px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
              Ташкент
            </div>

            <h1 className="display mx-auto max-w-3xl text-4xl leading-[1.1] text-on-dark sm:text-6xl">
              Вся мебель города
              <br />
              <span className="text-gold">в одном месте</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-on-dark-muted">
              Готовая мебель и мебель на заказ от мастеров и фабрик Ташкента.
              Сравните работы и цены — и звоните напрямую, без посредников.
            </p>

            <form action="/catalog" className="mx-auto mt-9 flex max-w-lg gap-2">
              <input
                type="search"
                name="q"
                placeholder="Например: кухня на заказ"
                aria-label="Поиск мебели"
                className="min-w-0 flex-1 border border-line-dark bg-ink-deep px-4 py-3 text-on-dark placeholder:text-on-dark-muted/70 outline-none transition-colors focus:border-gold"
              />
              <button
                type="submit"
                className="bg-gold px-7 py-3 font-semibold text-ink transition-colors hover:bg-on-dark"
              >
                Найти
              </button>
            </form>

            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {categoryLinks.map((category) => (
                <Link
                  key={category.slug}
                  href={`/catalog?category=${category.slug}`}
                  className="border border-line-dark px-4 py-2 text-sm text-on-dark-muted transition-colors hover:border-gold hover:text-gold"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Главная развилка покупателя мебели: взять готовое или заказать своё */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/catalog?type=ready_made"
            className="group border border-line bg-paper p-8 transition-colors hover:border-gold"
          >
            <h2 className="display gold-rule text-xl">Готовая мебель</h2>
            <p className="mt-5 leading-relaxed text-text-muted">
              То, что можно купить и забрать сейчас. Фото и цены — сразу в каталоге.
            </p>
            <span className="mt-6 inline-block font-semibold text-gold-deep">
              Смотреть каталог →
            </span>
          </Link>

          <Link
            href="/catalog?type=custom_order"
            className="group border border-line bg-paper p-8 transition-colors hover:border-gold"
          >
            <h2 className="display gold-rule text-xl">Мебель на заказ</h2>
            <p className="mt-5 leading-relaxed text-text-muted">
              Своя идея, свои размеры. Найдите мастера, который делает именно то,
              что вам нужно.
            </p>
            <span className="mt-6 inline-block font-semibold text-gold-deep">
              Найти мастера →
            </span>
          </Link>
        </div>
      </section>

      {/* Свежие работы */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="display gold-rule text-2xl">Новые работы</h2>
          <Link href="/catalog" className="text-sm font-semibold text-gold-deep hover:underline">
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
          <div className="border border-dashed border-line bg-paper p-12 text-center">
            <p className="text-text-muted">Каталог пока пуст — площадка только запускается.</p>
            <Link
              href="/dashboard"
              className="mt-5 inline-block bg-gold px-6 py-3 font-semibold text-ink transition-colors hover:bg-ink hover:text-gold"
            >
              Разместить свою мебель первым
            </Link>
          </div>
        )}
      </section>

      {/* Две стороны площадки: кто покупает и кто делает */}
      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-10 sm:grid-cols-2">
            <div className="border border-gold/30 p-8">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
                Покупателям
              </div>
              <h2 className="display text-xl text-on-dark sm:text-2xl">Купить мебель</h2>
              <p className="mt-5 leading-relaxed text-on-dark-muted">
                Заведите кабинет — и все ваши заявки мастерам будут в одном месте.
                Не забудете, кому писали, о чём договорились и кто уже ответил.
              </p>
              <Link
                href="/auth?role=buyer"
                className="mt-7 inline-block bg-gold px-7 py-3 font-semibold text-ink transition-colors hover:bg-on-dark"
              >
                Создать кабинет покупателя
              </Link>
              <p className="mt-4 text-sm text-on-dark-muted">
                Или просто{' '}
                <Link href="/catalog" className="text-gold hover:underline">
                  смотрите каталог
                </Link>{' '}
                — звонить мастеру можно и без регистрации.
              </p>
            </div>

            <div className="border border-gold/30 p-8">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
                Мастерам
              </div>
              <h2 className="display text-xl text-on-dark sm:text-2xl">
                Делаете мебель? Вас найдут здесь
              </h2>
              <p className="mt-5 leading-relaxed text-on-dark-muted">
                Разместите свои работы и телефон — и получайте звонки от клиентов,
                которые ищут именно вашу мебель. Регистрация бесплатная.
              </p>
              <Link
                href="/auth"
                className="mt-7 inline-block bg-gold px-7 py-3 font-semibold text-ink transition-colors hover:bg-on-dark"
              >
                Разместить мебель
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
