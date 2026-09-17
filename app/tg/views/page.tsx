import { Stars } from '@/components/stars'
import { TgWelcome } from '@/components/tg-welcome'
import { getTgContext } from '@/lib/tg'

export const metadata = { title: 'Просмотры' }

type Review = {
  id: number
  rating: number
  text: string | null
  author_name: string | null
  created_at: string
}

export default async function TgViews() {
  const context = await getTgContext()
  if (context.state !== 'master') return <TgWelcome state={context.state} />

  const { supabase, company } = context

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [week, month, reviews] = await Promise.all([
    supabase
      .from('contact_views')
      .select('visitor', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .gte('day', weekAgo),
    supabase
      .from('contact_views')
      .select('visitor', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .gte('day', monthAgo),
    supabase
      .from('reviews')
      .select('id, rating, text, author_name, created_at')
      .eq('company_id', company.id)
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const list = (reviews.data ?? []) as Review[]

  return (
    <div className="px-4 py-5">
      <div className="display truncate text-xl text-text">{company.name}</div>

      {/* Сколько людей вас увидели */}
      <div className="mt-4 rounded-2xl bg-paper p-5">
        <div className="text-sm text-text-muted">Смотрели страницу</div>
        <div className="display mt-1 text-4xl text-text">{company.views_count ?? 0}</div>
        <div className="mt-1 text-xs text-text-muted">за всё время, разные люди</div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-paper p-4">
          <div className="text-xs text-text-muted">Хотели позвонить</div>
          <div className="display mt-1 text-2xl text-text">{week.count ?? 0}</div>
          <div className="text-[0.6875rem] text-text-muted">за неделю</div>
        </div>
        <div className="rounded-2xl bg-paper p-4">
          <div className="text-xs text-text-muted">Хотели позвонить</div>
          <div className="display mt-1 text-2xl text-text">{month.count ?? 0}</div>
          <div className="text-[0.6875rem] text-text-muted">за месяц</div>
        </div>
      </div>

      {/* Рейтинг */}
      <div className="mt-2.5 rounded-2xl bg-paper p-5">
        <div className="text-sm text-text-muted">Оценка мастерской</div>
        <div className="mt-2">
          <Stars
            value={Number(company.rating_avg)}
            count={company.rating_count}
            size="large"
          />
        </div>
        {company.rating_count === 0 && (
          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            Попросите довольного клиента поставить оценку — следующие приходят
            увереннее, когда видят звёзды.
          </p>
        )}
      </div>

      {list.length > 0 && (
        <>
          <div className="mt-5 text-sm font-semibold text-text">Что пишут</div>
          <ul className="mt-3 space-y-2">
            {list.map((review) => (
              <li key={review.id} className="rounded-2xl bg-paper p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-text">
                    {review.author_name ?? 'Покупатель'}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(review.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <Stars value={review.rating} count={1} className="mt-1.5 [&>span:last-child]:hidden" />
                {review.text && (
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{review.text}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
