'use client'

import { useActionState, useState } from 'react'
import { submitReview, type ReviewState } from '@/app/reviews/actions'
import { StarShape } from '@/components/stars'
import { SubmitButton } from '@/components/submit-button'
import { useDict } from '@/components/locale-provider'

/**
 * Форма отзыва: звёзды, которые подсвечиваются под курсором,
 * и необязательный текст. Если отзыв уже был — поля заполнены им.
 */
export function ReviewForm({
  companyId,
  initial,
}: {
  companyId: number
  initial?: { rating: number; text: string | null } | null
}) {
  const dict = useDict()
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [state, action] = useActionState<ReviewState, FormData>(submitReview, {})

  const shown = hover || rating

  return (
    <form action={action} className="rounded-3xl bg-paper p-5 sm:p-6">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="display text-lg text-text">
        {initial ? dict.reviews.editTitle : dict.reviews.formTitle}
      </div>

      <div className="mt-4 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} ${dict.reviews.of5}`}
            onMouseEnter={() => setHover(star)}
            onClick={() => setRating(star)}
            className="press p-0.5"
          >
            <StarShape
              className={`size-8 transition-colors duration-150 ${
                star <= shown ? 'text-[#f5b301]' : 'text-line'
              }`}
            />
          </button>
        ))}
        {shown > 0 && (
          <span className="ml-2 text-sm text-text-muted">{dict.reviews.labels[shown - 1]}</span>
        )}
      </div>

      <textarea
        name="text"
        rows={3}
        maxLength={1000}
        defaultValue={initial?.text ?? ''}
        placeholder={dict.reviews.placeholder}
        className="mt-4 w-full resize-none rounded-2xl bg-cream px-4 py-3 text-text outline-none transition-shadow placeholder:text-text-muted focus:shadow-[0_0_0_2px_var(--gold)]"
      />

      {state.error && <p className="mt-3 text-sm text-status-error">{state.error}</p>}
      {state.message && <p className="mt-3 text-sm text-status-done">{state.message}</p>}

      <SubmitButton
        pendingLabel="…"
        className="mt-4 rounded-full bg-gold px-6 py-2.5 font-semibold text-white hover:bg-gold-deep disabled:opacity-60"
      >
        {initial ? dict.reviews.update : dict.reviews.send}
      </SubmitButton>
    </form>
  )
}
