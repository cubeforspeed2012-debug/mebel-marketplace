import Link from 'next/link'
import { CompanyCard } from '@/components/company-card'
import { DISTRICTS, WORK_TYPES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/lib/types'

export const revalidate = 300

export const metadata = {
  title: 'Мебельные мастера и фабрики Ташкента',
  description:
    'Все мебельщики города в одном списке: кто делает готовую мебель, кто на заказ. Фильтр по районам, прямые телефоны.',
}

type SearchParams = { work_type?: string; district?: string }

async function getCompanies(params: SearchParams) {
  try {
    const supabase = await createClient()
    let query = supabase.from('companies').select('*').eq('status', 'active')

    if (params.work_type && params.work_type in WORK_TYPES) {
      // «Готовая и на заказ» подходит под оба запроса.
      query =
        params.work_type === 'both'
          ? query.eq('work_type', 'both')
          : query.in('work_type', [params.work_type, 'both'])
    }

    if (params.district) query = query.eq('district', params.district)

    const { data } = await query
      .order('boosted_until', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(100)

    return (data ?? []) as Company[]
  } catch {
    return [] as Company[]
  }
}

function chipHref(current: SearchParams, key: keyof SearchParams, value: string) {
  const next = { ...current }
  if (current[key] === value) delete next[key]
  else next[key] = value

  const query = new URLSearchParams(
    Object.entries(next).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString()

  return query ? `/companies?${query}` : '/companies'
}

function Chip({
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

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const companies = await getCompanies(params)

  return (
    <>
      <div className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="display gold-rule text-3xl text-ink">Мастера Ташкента</h1>
          <p className="mt-6 max-w-xl leading-relaxed text-text-muted">
            Фабрики, цеха и частные мастера города. Выбирайте по типу работы и району —
            и звоните напрямую.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="space-y-5">
          <div>
            <div className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
              Что делают
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(WORK_TYPES).map(([value, label]) => (
                <Chip
                  key={value}
                  href={chipHref(params, 'work_type', value)}
                  active={params.work_type === value}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          <details>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-text-muted hover:text-text">
              Район {params.district && <span className="text-gold-deep">· {params.district}</span>}
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {DISTRICTS.map((district) => (
                <Chip
                  key={district}
                  href={chipHref(params, 'district', district)}
                  active={params.district === district}
                >
                  {district}
                </Chip>
              ))}
            </div>
          </details>
        </div>

        <div className="mt-12">
          {companies.length > 0 ? (
            <div className="stagger grid gap-4 sm:grid-cols-2">
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius)] border border-dashed border-line bg-paper p-14 text-center">
              <p className="text-text-muted">Мастеров пока нет — площадка только запускается.</p>
              <Link
                href="/dashboard"
                className="mt-5 inline-block bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-deep"
              >
                Стать первым мастером на площадке
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
