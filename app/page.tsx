import Link from 'next/link'
import { ProductCard } from '@/components/product-card'
import { FALLBACK_CATEGORIES } from '@/lib/constants'
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
        .limit(8),
    ])

    return {
      categories: (categoriesResult.data ?? []) as Category[],
      products: (productsResult.data ?? []) as unknown as ProductCardType[],
    }
  } catch {
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
      {/* Первый экран: тёплый песочный свет, крупная типографика, поиск в центре внимания */}
      <section
        className="relative overflow-hidden border-b border-line"
        style={{
          background:
            'radial-gradient(120% 80% at 15% 0%, #262626 0%, #181818 45%, #101010 100%)',
        }}
      >
        {/* Мягкое тёплое пятно света — как от лампы в шоуруме */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(138,112,83,0.35) 0%, transparent 70%)' }}
        />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="eyebrow">Ташкент</div>

            <h1 className="display mt-4 text-[2.6rem] leading-[1.05] text-text sm:text-6xl">
              Вся мебель города
              <br />
              <span className="text-gold">в одном месте</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
              Готовая мебель и мебель на заказ от мастеров и фабрик Ташкента.
              Сравните работы и цены — и звоните напрямую, без посредников.
            </p>

            <form action="/catalog" className="mt-9 flex max-w-lg gap-2">
              <input
                type="search"
                name="q"
                placeholder="Например: кухня на заказ"
                aria-label="Поиск мебели"
                className="min-w-0 flex-1 rounded-full border border-line bg-paper px-6 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.35)] outline-none transition-shadow duration-200 focus:shadow-[0_0_0_2px_var(--gold)]"
              />
              <button
                type="submit"
                className="press rounded-full bg-gold px-8 py-4 font-semibold text-white shadow-[0_6px_18px_rgba(138,112,83,0.35)] transition-colors duration-200 hover:bg-gold-deep"
              >
                Найти
              </button>
            </form>

            <div className="stagger mt-6 flex flex-wrap gap-2">
              {categoryLinks.map((category) => (
                <Link
                  key={category.slug}
                  href={`/catalog?category=${category.slug}`}
                  className="press rounded-full border border-line bg-paper/70 px-5 py-2.5 text-sm text-text-muted transition-colors duration-200 hover:border-gold hover:text-gold"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Что даёт площадка — три коротких обещания */}
          <div className="stagger grid gap-3">
            {[
              ['Мастера города', 'Фабрики и частные цеха в одном каталоге'],
              ['Прямой звонок', 'Без посредников и наценки за знакомство'],
              ['Своя идея', 'Мебель на заказ по вашим размерам'],
            ].map(([title, text]) => (
              <div
                key={title}
                className="lift rounded-2xl border border-line bg-paper/80 p-5 backdrop-blur-sm"
              >
                <div className="font-semibold text-text">{title}</div>
                <div className="mt-1 text-sm leading-relaxed text-text-muted">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Главная развилка покупателя */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="stagger grid gap-4 sm:grid-cols-2">
          <Link
            href="/catalog?type=ready_made"
            className="lift rounded-[var(--radius)] border border-line bg-paper p-8"
          >
            <h2 className="display gold-rule text-xl text-text">Готовая мебель</h2>
            <p className="mt-5 leading-relaxed text-text-muted">
              То, что можно купить и забрать сейчас. Фото и цены — сразу в каталоге.
            </p>
            <span className="mt-6 inline-block font-semibold text-gold">
              Смотреть каталог →
            </span>
          </Link>

          <Link
            href="/catalog?type=custom_order"
            className="lift rounded-[var(--radius)] border border-line bg-paper p-8"
          >
            <h2 className="display gold-rule text-xl text-text">Мебель на заказ</h2>
            <p className="mt-5 leading-relaxed text-text-muted">
              Своя идея, свои размеры. Найдите мастера, который делает именно то,
              что вам нужно.
            </p>
            <span className="mt-6 inline-block font-semibold text-gold">Найти мастера →</span>
          </Link>
        </div>
      </section>

      {/* Свежие работы */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mb-7 flex items-end justify-between">
          <h2 className="display gold-rule text-2xl text-text">Новые работы</h2>
          <Link href="/catalog" className="text-sm font-semibold text-gold hover:underline">
            Весь каталог →
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius)] border border-dashed border-line bg-paper p-12 text-center">
            <p className="text-text-muted">Каталог пока пуст — площадка только запускается.</p>
            <Link
              href="/dashboard"
              className="press mt-5 inline-block rounded-[var(--radius)] bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
            >
              Разместить свою мебель первым
            </Link>
          </div>
        )}
      </section>

      {/* Две стороны площадки */}
      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-line-dark p-8">
              <div className="eyebrow text-gold">Покупателям</div>
              <h2 className="display mt-3 text-xl text-on-dark sm:text-2xl">Купить мебель</h2>
              <p className="mt-4 leading-relaxed text-on-dark-muted">
                Заведите кабинет — и все ваши заявки мастерам будут в одном месте.
                Не забудете, кому писали и кто уже ответил.
              </p>
              <Link
                href="/auth?role=buyer"
                className="press mt-6 inline-block rounded-[var(--radius)] bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
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

            <div className="rounded-[var(--radius)] border border-line-dark p-8">
              <div className="eyebrow text-gold">Мастерам</div>
              <h2 className="display mt-3 text-xl text-on-dark sm:text-2xl">
                Делаете мебель? Вас найдут здесь
              </h2>
              <p className="mt-4 leading-relaxed text-on-dark-muted">
                Разместите свои работы и телефон — и получайте звонки от клиентов,
                которые ищут именно вашу мебель. Регистрация бесплатная.
              </p>
              <Link
                href="/auth"
                className="press mt-6 inline-block rounded-[var(--radius)] bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
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
