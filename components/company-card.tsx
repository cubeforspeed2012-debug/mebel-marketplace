import Link from 'next/link'
import { WORK_TYPES } from '@/lib/constants'
import type { Company } from '@/lib/types'

/** Карточка мебельщика в списке мастеров. */
export function CompanyCard({ company }: { company: Company }) {
  return (
    <Link
      href={`/company/${company.slug ?? company.id}`}
      className="lift flex gap-4 rounded-[var(--radius)] border border-line bg-paper p-5 hover:border-gold"
    >
      <div className="size-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-cream">
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo_url}
            alt={company.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="display flex h-full items-center justify-center text-xl text-gold">
            {company.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-ink">{company.name}</h3>

        <div className="eyebrow mt-1">
          {company.work_type && WORK_TYPES[company.work_type]}
          {company.district && <span> · {company.district}</span>}
        </div>

        {company.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">
            {company.description}
          </p>
        )}
      </div>
    </Link>
  )
}
