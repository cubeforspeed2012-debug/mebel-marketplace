type Day = { day: string; views: number }

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

/**
 * Посещения по дням. Тёмная карточка, столбики, последний день выделен золотом —
 * так сразу видно сегодняшний результат на фоне двух недель.
 */
export function ViewsChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.views))
  const total = days.reduce((sum, d) => sum + d.views, 0)
  const half = Math.round(max / 2)

  return (
    <div className="rounded-3xl bg-[#1f1f1f] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-[#8f8f8f]">Посещения площадки</div>
          <div className="mt-1 text-3xl font-semibold text-white">{total}</div>
          <div className="mt-1 text-xs text-[#8f8f8f]">за последние {days.length} дней</div>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#8f8f8f]">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#3f3f3f]" /> дни
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-gold" /> сегодня
          </span>
        </div>
      </div>

      {total === 0 ? (
        <p className="mt-8 text-sm text-[#8f8f8f]">
          Пока никто не заходил. Цифры появятся, как только люди начнут открывать
          страницы мастеров и товаров.
        </p>
      ) : (
        <div className="mt-7 flex gap-3">
          {/* Шкала слева — как на приборной панели */}
          <div className="flex h-40 w-8 shrink-0 flex-col justify-between pb-6 text-right text-[0.625rem] text-[#6b6b6b]">
            <span>{max}</span>
            <span>{half}</span>
            <span>0</span>
          </div>

          <div
            className="flex h-40 flex-1 items-end gap-1.5"
            role="img"
            aria-label={`Посещения по дням, всего ${total}`}
          >
            {days.map((day, index) => {
              const height = Math.round((day.views / max) * 100)
              const last = index === days.length - 1
              const date = new Date(day.day)

              return (
                <div key={day.day} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-md transition-all duration-500 ${
                        last ? 'bg-gold' : 'bg-[#3a3a3a] group-hover:bg-[#4d4d4d]'
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-[#171717] opacity-0 transition-opacity group-hover:opacity-100">
                      {day.views}
                    </span>
                  </div>
                  <span className="text-[0.625rem] text-[#6b6b6b]">{WEEKDAYS[date.getDay()]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
