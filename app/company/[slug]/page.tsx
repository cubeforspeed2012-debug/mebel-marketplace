import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/product-card'
import { formatPhone, WORK_TYPES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { Company, ProductCard as ProductCardType } from '@/lib/types'

export const revalidate = 300

async function getCompany(slug: string) {
  try {
    const supabase = await createClient()

    // В адресе может быть и slug («mebel-usta»), и просто id («12»).
    const isNumeric = /^\d+$/.test(slug)
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq(isNumeric ? 'id' : 'slug', isNumeric ? Number(slug) : slug)
      .eq('status', 'active')
      .maybeSingle()

    if (!company) return null

    const { data: products } = await supabase
      .from('products')
      .select(
        `id, company_id, category_id, slug, title, description, type, price,
         price_from, currency, status, boosted_until, views_count, created_at,
         companies (id, name, slug, district, phone_public, work_type),
         product_images (id, product_id, url, sort_order),
         categories (id, name, slug)`,
      )
      .eq('company_id', company.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    return {
      company: company as Company,
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
      `${company.name}: ${company.work_type ? WORK_TYPES[company.work_type].toLowerCase() : 'мебель'} в Ташкенте${
        company.district ? `, ${company.district} район` : ''
      }. Фото работ и прямой телефон.`,
  }
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getCompany(slug)
  if (!data) notFound()

  const { company, products } = data

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Шапка профиля */}
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-start">
        <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_url}
              alt={company.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl font-semibold text-accent">
              {company.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{company.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
            {company.work_type && <span>{WORK_TYPES[company.work_type]}</span>}
            {company.district && <span>· {company.district} район</span>}
            {company.phone_verified && (
              <span className="rounded-md bg-accent-soft px-2 py-0.5 text-sm font-medium text-accent">
                Телефон подтверждён
              </span>
            )}
          </div>

          {company.description && (
            <p className="mt-4 max-w-2xl leading-relaxed">{company.description}</p>
          )}

          {company.address && (
            <p className="mt-3 text-sm text-muted">Адрес: {company.address}</p>
          )}

          {/* Главное действие — звонок. Так покупают мебель в Ташкенте. */}
          <div className="mt-6 flex flex-wrap gap-3">
            {company.phone_public && (
              <a
                href={`tel:${company.phone_public.replace(/\s/g, '')}`}
                className="rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Позвонить {formatPhone(company.phone_public)}
              </a>
            )}
            {company.telegram && (
              <a
                href={`https://t.me/${company.telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border px-6 py-3 font-medium transition-colors hover:border-accent hover:text-accent"
              >
                Telegram
              </a>
            )}
            {company.instagram && (
              <a
                href={`https://instagram.com/${company.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border px-6 py-3 font-medium transition-colors hover:border-accent hover:text-accent"
              >
                Instagram
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Работы мастера */}
      <section className="mt-10">
        <h2 className="mb-5 text-2xl font-semibold">
          Работы {products.length > 0 && <span className="text-muted">({products.length})</span>}
        </h2>

        {products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
            Мастер пока не добавил работы.
          </p>
        )}
      </section>

      <div className="mt-10">
        <Link href="/catalog" className="text-accent hover:underline">
          ← Вернуться в каталог
        </Link>
      </div>
    </div>
  )
}
