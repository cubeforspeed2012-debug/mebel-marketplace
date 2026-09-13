'use client'

import { usePathname } from 'next/navigation'
import { useOptimistic, useTransition } from 'react'
import { toggleFavorite } from '@/app/favorites/actions'

/**
 * Сердечко. Закрашивается сразу по нажатию, не дожидаясь сервера —
 * иначе кажется, что не сработало.
 */
export function FavoriteButton({
  productId,
  active,
  size = 'small',
}: {
  productId: number
  active: boolean
  size?: 'small' | 'large'
}) {
  const pathname = usePathname()
  const [optimistic, setOptimistic] = useOptimistic(active)
  const [, startTransition] = useTransition()

  const big = size === 'large'

  return (
    <button
      type="button"
      aria-label={optimistic ? 'Убрать из любимого' : 'В любимое'}
      aria-pressed={optimistic}
      onClick={(event) => {
        // Сердечко живёт внутри ссылки на товар — переход не нужен
        event.preventDefault()
        event.stopPropagation()

        const data = new FormData()
        data.set('product_id', String(productId))
        data.set('next', pathname)

        startTransition(async () => {
          setOptimistic(!optimistic)
          await toggleFavorite(data)
        })
      }}
      className={`press flex items-center justify-center rounded-full backdrop-blur transition-colors duration-200 ${
        big ? 'size-11' : 'size-9'
      } ${optimistic ? 'bg-gold text-white' : 'bg-paper/85 text-text-muted hover:text-gold'}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${big ? 'size-6' : 'size-5'} ${optimistic ? 'pop' : ''}`}
        fill={optimistic ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 20s-7.5-4.7-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3C19.5 15.3 12 20 12 20Z" />
      </svg>
    </button>
  )
}
