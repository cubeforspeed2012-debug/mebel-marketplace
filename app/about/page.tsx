import Link from 'next/link'
import { CountUp } from '@/components/count-up'
import { IconArmchair, IconCrib, IconDesk, IconKitchen, IconSofa, IconWardrobe } from '@/components/furniture-icons'
import { ProductCard } from '@/components/product-card'
import { Reveal } from '@/components/reveal'
import { getDictionary } from '@/lib/locale'
import { getFavoriteIds } from '@/lib/favorites'
import { createClient } from '@/lib/supabase/server'
import type { ProductCard as ProductCardType } from '@/lib/types'

export const revalidate = 600

export const metadata = {
  title: 'О площадке',
  description:
    'Mebel — площадка мебельных мастеров Ташкента. Покупателю: живые работы и прямой телефон мастера. Мастеру: бесплатная страница, заявки в Telegram, честная статистика.',
}

/** Живые цифры для витрины. Если база молчит — показываем нули, страница не падает. */
async function getFigures() {
  try {
    const supabase = await createClient()
    const [masters, works, districts, featured] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('companies').select('district').eq('status', 'active').not('district', 'is', null),
      supabase
        .from('products')
        .select(
          `id, company_id, category_id, slug, title, description, type, price,
           price_from, currency, status, boosted_until, views_count, created_at,
           companies!inner (id, name, slug, district, has_phone, rating_avg, rating_count, work_type),
           product_images (id, product_id, url, sort_order),
           categories (id, name, slug)`,
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4),
    ])

    return {
      masters: masters.count ?? 0,
      works: works.count ?? 0,
      districts: new Set((districts.data ?? []).map((row) => row.district)).size,
      featured: (featured.data ?? []) as unknown as ProductCardType[],
    }
  } catch {
    return { masters: 0, works: 0, districts: 0, featured: [] as ProductCardType[] }
  }
}

/* Значки для сетки «почему мастера выбирают» — одной толщины, как весь набор */
const WHY_ICONS = [
  <path key="free" d="M12 3v18M7 7.5c0-1.7 2.2-3 5-3s5 1.3 5 3-2.2 3-5 3-5 1.3-5 3 2.2 3 5 3 5-1.3 5-3" />,
  <path key="tg" d="M21 4 3 11.2l6.2 2.3L11.5 20l3-4.2 4.6 3.4L21 4Z" />,
  <path key="chart" d="M4 19.5h16M7 16v-5M12 16V7M17 16v-3" />,
  <path key="page" d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1ZM15 3.5v4h4M8.5 12h7M8.5 16h5" />,
  <path key="star" d="M12 3.5 14.7 9l6 .8-4.4 4.2 1.1 6-5.4-2.9L6.6 20l1.1-6L3.3 9.8l6-.8L12 3.5Z" />,
  <path key="hand" d="M4 12.5 9.5 18 20 6.5" />,
]

const CATEGORY_ICONS = [IconKitchen, IconWardrobe, IconSofa, IconCrib, IconDesk, IconArmchair]

export default async function AboutPage() {
  const dict = await getDictionary()
  const t = dict.about
  const [figures, favorites] = await Promise.all([getFigures(), getFavoriteIds()])

  // Бегущая строка — категории по кругу. Список удвоен, чтобы шов не был виден.
  const ticker = [...Object.values(dict.categories), ...Object.values(dict.categories)]

  return (
    <div className="overflow-x-clip">
      {/* ------------------------------------------------------------------
          Первый экран: крупный заголовок с маркером, две двери и вход
          ------------------------------------------------------------------ */}
      <section className="relative bg-paper">
        <div className="blob left-[-10%] top-[-20%] h-[28rem] w-[28rem] bg-lime" />
        <div className="blob right-[-8%] top-[10%] h-[24rem] w-[24rem] bg-gold-soft" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pt-20">
          <div className="flex items-center justify-between gap-3">
            <div className="eyebrow text-gold">{t.eyebrow}</div>
            <div className="flex shrink-0 gap-2">
              <Link
                href="/auth"
                className="press rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-gold"
              >
                {t.signIn}
              </Link>
              <Link
                href="/auth?mode=signup"
                className="press rounded-full bg-text px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
              >
                {t.register}
              </Link>
            </div>
          </div>

          <h1 className="display mt-8 max-w-4xl text-4xl leading-[1.05] text-text sm:text-6xl">
            {t.titleStart} <span className="marker">{t.titleMarker}</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">{t.lead}</p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="press rounded-full bg-gold px-8 py-4 font-semibold text-white transition-colors hover:bg-gold-deep"
            >
              {t.findMaster}
            </Link>
            <Link
              href="/auth"
              className="press rounded-full bg-lime px-8 py-4 font-semibold text-lime-ink transition-colors hover:bg-lime-deep"
            >
              {t.becomeMaster}
            </Link>
          </div>

          {/* Живые цифры, разгоняются при появлении */}
          <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: figures.masters, suffix: '+', label: t.statMasters },
              { value: figures.works, suffix: '+', label: t.statWorks },
              { value: figures.districts, suffix: '', label: t.statDistricts },
              { value: 0, suffix: '%', label: t.statFee },
            ].map((stat, index) => (
              <Reveal key={stat.label} delay={index * 80}>
                <div className="rounded-3xl border border-line bg-paper/70 p-5 backdrop-blur">
                  <div className="display text-4xl text-text">
                    <CountUp to={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="mt-1 text-sm text-text-muted">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Бегущая строка категорий — между первым экраном и остальным */}
        <div className="overflow-hidden border-y border-line bg-cream py-3">
          <div className="marquee gap-8">
            {ticker.map((name, index) => {
              const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]
              return (
                <span key={`${name}-${index}`} className="flex items-center gap-2 text-sm text-text-muted">
                  <Icon className="size-4.5 text-gold" />
                  {name}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Кому это: две большие карточки — светлая и лаймовая
          ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <div className="lift h-full rounded-[28px] border border-line bg-paper p-7 sm:p-9">
              <div className="eyebrow text-gold">{t.forBuyer}</div>
              <h2 className="display mt-3 text-2xl leading-tight text-text sm:text-3xl">{t.buyerTitle}</h2>
              <ul className="mt-6 space-y-3">
                {t.buyerPoints.map((point) => (
                  <li key={point} className="flex gap-3 text-text-muted">
                    <Check className="mt-1 size-4 shrink-0 text-gold" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link href="/catalog" className="arrow-out mt-8 inline-flex items-center gap-2 font-semibold text-gold">
                {t.findMaster} <Arrow />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="lift h-full rounded-[28px] bg-lime p-7 text-lime-ink sm:p-9">
              <div className="eyebrow text-lime-ink/70">{t.forMaster}</div>
              <h2 className="display mt-3 text-2xl leading-tight sm:text-3xl">{t.masterTitle}</h2>
              <ul className="mt-6 space-y-3">
                {t.masterPoints.map((point) => (
                  <li key={point} className="flex gap-3 text-lime-ink/85">
                    <Check className="mt-1 size-4 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                className="press mt-8 inline-flex items-center gap-2 rounded-full bg-lime-ink px-6 py-3 font-semibold text-lime transition-opacity hover:opacity-90"
              >
                {t.becomeMaster} <Arrow />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Как это работает: три пронумерованных шага
          ------------------------------------------------------------------ */}
      <section className="border-y border-line bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <Reveal>
            <h2 className="display gold-rule text-3xl text-text">{t.howTitle}</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {t.steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 100}>
                <div className="lift h-full rounded-3xl border border-line bg-paper p-6">
                  <div className="display text-5xl text-gold-soft [-webkit-text-stroke:1.5px_var(--gold)]">
                    0{index + 1}
                  </div>
                  <h3 className="display mt-4 text-xl text-text">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-text-muted">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Свежие работы — показываем товар лицом
          ------------------------------------------------------------------ */}
      {figures.featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Reveal>
            <div className="flex items-end justify-between gap-3">
              <h2 className="display gold-rule text-3xl text-text">{t.featuredTitle}</h2>
              <Link href="/catalog" className="arrow-out inline-flex items-center gap-2 font-semibold text-gold">
                {t.featuredAll} <Arrow />
              </Link>
            </div>
          </Reveal>
          <div className="stagger mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {figures.featured.map((product) => (
              <ProductCard key={product.id} product={product} favorite={favorites.has(product.id)} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------
          Почему мастера: сетка из шести причин со значками
          ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <h2 className="display gold-rule text-3xl text-text">{t.whyTitle}</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.why.map((item, index) => (
            <Reveal key={item.title} delay={(index % 3) * 90}>
              <div className="lift h-full rounded-3xl border border-line bg-paper p-6">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gold-soft text-gold">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" strokeWidth={1.8}
                       stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {WHY_ICONS[index]}
                  </svg>
                </div>
                <h3 className="display mt-4 text-lg text-text">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Финальный призыв — тёмная плашка с лаймовой кнопкой
          ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] bg-text px-7 py-12 text-paper sm:px-12 sm:py-16">
            <div className="blob right-[-10%] top-[-40%] h-[22rem] w-[22rem] bg-lime opacity-40" />
            <div className="blob bottom-[-50%] left-[10%] h-[18rem] w-[18rem] bg-gold opacity-40" />
            <div className="relative max-w-2xl">
              <h2 className="display text-3xl leading-tight sm:text-4xl">{t.ctaTitle}</h2>
              <p className="mt-4 text-lg leading-relaxed text-paper/75">{t.ctaText}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className="press rounded-full bg-lime px-8 py-4 font-semibold text-lime-ink transition-colors hover:bg-lime-deep"
                >
                  {t.ctaButton}
                </Link>
                <Link
                  href="/catalog"
                  className="press rounded-full border border-paper/30 px-8 py-4 font-semibold text-paper transition-colors hover:border-paper"
                >
                  {t.ctaSecondary}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}

function Check({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" strokeWidth={2.4}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" strokeWidth={2.2}
         stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  )
}
