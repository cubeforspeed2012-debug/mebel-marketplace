import Link from 'next/link'
import { getDictionary } from '@/lib/locale'

export const metadata = {
  title: 'Условия использования',
  description:
    'Как работает площадка Mebel: что делает площадка, за что отвечает мастер, за что отвечает покупатель.',
}

export default async function TermsPage() {
  const dict = await getDictionary()

  return (
    <>
      <div className="border-b border-line bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="display gold-rule text-3xl text-text">{dict.terms.title}</h1>
          <p className="mt-6 leading-relaxed text-text-muted">{dict.terms.lead}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-10">
          {dict.terms.sections.map((section) => (
            <section key={section.title}>
              <h2 className="display gold-rule text-lg">{section.title}</h2>
              <div className="mt-5 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="leading-relaxed text-text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-[var(--radius)] border border-line bg-paper p-6">
          <p className="leading-relaxed">
            {dict.terms.footerStart}{' '}
            <Link href="/companies" className="font-semibold text-gold-deep hover:underline">
              {dict.terms.footerLink}
            </Link>{' '}
            {dict.terms.footerEnd}
          </p>
        </div>
      </div>
    </>
  )
}
