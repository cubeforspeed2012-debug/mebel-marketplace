import Link from 'next/link'
import { getDictionary } from '@/lib/locale'

export const metadata = {
  title: 'Политика конфиденциальности',
  description:
    'Какие данные собирает площадка Mebel, зачем они нужны, кто их видит и как их удалить.',
}

export default async function PrivacyPage() {
  const dict = await getDictionary()

  return (
    <>
      <div className="border-b border-line bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="display gold-rule text-3xl text-text">{dict.privacy.title}</h1>
          <p className="mt-6 leading-relaxed text-text-muted">{dict.privacy.lead}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-10">
          {dict.privacy.sections.map((section) => (
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
            {dict.privacy.footerStart}{' '}
            <Link href="/terms" className="font-semibold text-gold-deep hover:underline">
              {dict.privacy.footerLink}
            </Link>
            {dict.privacy.footerEnd}
          </p>
        </div>
      </div>
    </>
  )
}
