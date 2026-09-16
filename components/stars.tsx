/**
 * Звёзды рейтинга — только показ. Половинки рисуем заливкой на 50%,
 * чтобы 4.5 читалось как 4.5, а не округлялось до 5.
 */
export function Stars({
  value,
  count,
  emptyLabel = 'Нет отзывов',
  size = 'small',
  className = '',
}: {
  value: number
  /** Сколько отзывов. Ноль — рисуем пустые звёзды с подписью, чтобы было видно, что оценить можно. */
  count?: number
  emptyLabel?: string
  size?: 'small' | 'large'
  className?: string
}) {
  const px = size === 'large' ? 'size-5' : 'size-3.5'
  const text = size === 'large' ? 'text-base' : 'text-xs'

  if (!count) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label={emptyLabel}>
        <span className="inline-flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarShape key={star} className={`${px} text-line`} />
          ))}
        </span>
        <span className={`text-text-muted ${text}`}>{emptyLabel}</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label={`Рейтинг ${value} из 5`}>
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.max(0, Math.min(1, value - (star - 1)))
          return (
            <span key={star} className={`relative ${px}`}>
              <StarShape className={`absolute inset-0 ${px} text-line`} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <StarShape className={`${px} text-[#f5b301]`} />
              </span>
            </span>
          )
        })}
      </span>
      <span className={`font-semibold text-text ${text}`}>{value.toFixed(1)}</span>
      <span className={`text-text-muted ${text}`}>({count})</span>
    </span>
  )
}

export function StarShape({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.8 14.9 8.7l6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9L12 2.8Z" />
    </svg>
  )
}
