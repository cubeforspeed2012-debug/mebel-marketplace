type Day = { day: string; views: number }

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

/**
 * Посещения по дням. Столбики, последний день выделен акцентом —
 * так сразу видно сегодняшний результат на фоне недели.
 */
export function ViewsChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.views))
  const total = days.reduce((sum, d) => sum + d.views, 0)

  return (
    <div className="rounded-2xl border border-line bg-paper p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Посещения площадки</div>
          <div className="display mt-1 text-3xl text-ink">{total}</div>
          <div className="mt-1 text-sm text-text-muted">за последние {days.length} дней</div>
        </div>
      </div>

      {total === 0 ? (
        <p className="mt-8 text-sm text-text-muted">
          Пока никто не заходил. Цифры появятся, как только люди начнут открывать
          страницы мастеров и товаров.
        </p>
      ) : (
        <div className="mt-8 flex h-40 items-end gap-1.5" role="img"
             aria-label={`Посещения по дням, всего ${total}`}>
          {days.map((day, index) => {
            const height = Math.round((day.views / max) * 100)
            const last = index === days.length - 1
            const date = new Date(day.day)

            return (
              <div key={day.day} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-[3px] transition-all duration-500 ${
                      last ? 'bg-gold' : 'bg-ink/85 group-hover:bg-ink'
                    }`}
                    style={{ height: `${Math.max(height, 3)}%` }}
                  />
                  <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-ink px-2 py-0.5 text-xs text-on-dark opacity-0 transition-opacity group-hover:opacity-100">
                    {day.views}
                  </span>
                </div>
                <span className="text-[0.625rem] text-text-muted">
                  {WEEKDAYS[date.getDay()]}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
