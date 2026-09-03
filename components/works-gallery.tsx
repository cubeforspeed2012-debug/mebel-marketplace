'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/lib/constants'

export type Work = {
  url: string
  title: string
  productId: number
  price: number | null
  priceFrom: boolean
}

/**
 * Витрина работ мастера. Страница мастерской — это его визитка,
 * которую он сам кидает клиентам в Telegram, поэтому фотографии здесь
 * крупные, а не мелкими карточками: сначала работа, потом подписи.
 */
export function WorksGallery({ works }: { works: Work[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const touchStart = useRef<number | null>(null)

  const close = useCallback(() => setOpen(null), [])
  const move = useCallback(
    (step: number) =>
      setOpen((current) =>
        current === null ? null : (current + step + works.length) % works.length,
      ),
    [works.length],
  )

  // Стрелки и Esc — на компьютере смотрят клавиатурой
  useEffect(() => {
    if (open === null) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') move(1)
      if (event.key === 'ArrowLeft') move(-1)
    }

    document.addEventListener('keydown', onKey)
    // Фон не должен уезжать под просмотрщиком
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, close, move])

  if (works.length === 0) return null

  const current = open === null ? null : works[open]

  return (
    <>
      {/* Первая работа крупнее остальных — взгляд цепляется за неё */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {works.map((work, index) => (
          <button
            key={`${work.productId}-${work.url}`}
            type="button"
            onClick={() => setOpen(index)}
            className={`group relative overflow-hidden rounded-[var(--radius)] border border-line bg-cream ${
              index === 0 ? 'col-span-2 row-span-2 sm:col-span-2' : ''
            }`}
            aria-label={`Открыть фото: ${work.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={work.url}
              alt={work.title}
              loading={index < 4 ? 'eager' : 'lazy'}
              className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-left text-xs font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:text-sm">
              {work.title}
            </span>
          </button>
        ))}
      </div>

      {current && (
        <div
          className="animate-fade fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={close}
          onTouchStart={(event) => {
            touchStart.current = event.touches[0].clientX
          }}
          onTouchEnd={(event) => {
            if (touchStart.current === null) return
            const delta = event.changedTouches[0].clientX - touchStart.current
            if (Math.abs(delta) > 50) move(delta < 0 ? 1 : -1)
            touchStart.current = null
          }}
        >
          <div className="flex items-center justify-between px-4 py-4 text-sm text-white/70">
            <span>
              {(open ?? 0) + 1} из {works.length}
            </span>
            <button
              type="button"
              onClick={close}
              className="press rounded-full bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
            >
              Закрыть
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.title}
              className="max-h-full max-w-full rounded-[var(--radius)] object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{current.title}</div>
              {current.price !== null && (
                <div className="text-sm text-white/60">
                  {current.priceFrom && 'от '}
                  {formatPrice(current.price)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {works.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => move(-1)}
                    aria-label="Предыдущее фото"
                    className="press rounded-full bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(1)}
                    aria-label="Следующее фото"
                    className="press rounded-full bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
                  >
                    →
                  </button>
                </>
              )}
              <Link
                href={`/product/${current.productId}`}
                className="press rounded-full bg-gold px-5 py-2 font-semibold text-white transition-colors hover:bg-gold-deep"
              >
                Открыть работу
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
