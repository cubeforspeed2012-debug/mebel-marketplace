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
      // «Оба типа» подходит и под готовую, и под заказ.
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

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const companies = await getCompanies(params)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Мебельные мастера Ташкента</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-muted">
        Фабрики, цеха и частные мастера города. Выбирайте по типу работы и району —
        и звоните напрямую.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <div className="mb-2 text-sm font-medium text-muted">Что делают</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(WORK_TYPES).map(([value, label]) => (
              <Link
                key={value}
                href={chipHref(params, 'work_type', value)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  params.work_type === value
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-surface hover:border-accent hover:text-accent'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <details>
          <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
            Район {params.district && <span className="text-accent">· {params.district}</span>}
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {DISTRICTS.map((district) => (
              <Link
                key={district}
                href={chipHref(params, 'district', district)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  params.district === district
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-surface hover:border-accent hover:text-accent'
                }`}
              >
                {district}
              </Link>
            ))}
          </div>
        </details>
      </div>

      <div className="mt-10">
        {companies.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted">Мастеров пока нет — площадка только запускается.</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Стать первым мастером на площадке
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
