import Link from 'next/link'
import { WORK_TYPES } from '@/lib/constants'
import type { Company } from '@/lib/types'

/** Карточка мебельщика в списке мастеров. */
export function CompanyCard({ company }: { company: Company }) {
  return (
    <Link
      href={`/company/${company.slug ?? company.id}`}
      className="flex gap-4 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-md"
    >
      <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-accent-soft">
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo_url}
            alt={company.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xl font-semibold text-accent">
            {company.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium">{company.name}</h3>

        <div className="mt-0.5 text-sm text-muted">
          {company.work_type && WORK_TYPES[company.work_type]}
          {company.district && <span> · {company.district} р-н</span>}
        </div>

        {company.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
            {company.description}
          </p>
        )}
      </div>
    </Link>
  )
}
