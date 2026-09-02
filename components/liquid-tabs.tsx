'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type TabItem = {
  href: string
  label: string
  icon?: (active: boolean) => React.ReactNode
}

// На сервере useLayoutEffect ругается — подменяем на обычный эффект
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Стеклянная навигация: активная «таблетка» не перепрыгивает, а перетекает —
 * передний край уходит вперёд, задний отстаёт, и капсула на лету растягивается.
 * Это и создаёт ощущение жидкого стекла.
 */
export function LiquidTabs({
  items,
  activeIndex,
  variant = 'bar',
}: {
  items: TabItem[]
  activeIndex: number
  variant?: 'bar' | 'inline'
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const previous = useRef<DOMRect | null>(null)
  const [ready, setReady] = useState(false)

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current
    const pill = pillRef.current
    const target = itemRefs.current[activeIndex]

    if (!list || !pill || !target || activeIndex < 0) {
      if (pill) pill.style.opacity = '0'
      return
    }

    const listBox = list.getBoundingClientRect()
    const box = target.getBoundingClientRect()

    // Ставим таблетку на новое место
    pill.style.opacity = '1'
    pill.style.left = `${box.left - listBox.left}px`
    pill.style.width = `${box.width}px`
    pill.style.top = `${box.top - listBox.top}px`
    pill.style.height = `${box.height}px`

    const from = previous.current
    previous.current = box

    // Первый рендер — без анимации, просто встаём на место
    if (!from || !ready) {
      setReady(true)
      return
    }

    const dx = from.left - box.left
    if (Math.abs(dx) < 1) return

    // Чем дальше прыжок, тем сильнее растяжение — но не бесконечно
    const stretch = 1 + Math.min(Math.abs(dx) / 220, 0.32)
    const startScale = from.width / box.width

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    pill.animate(
      [
        { transform: `translateX(${dx}px) scaleX(${startScale})` },
        { transform: `translateX(${dx * 0.42}px) scaleX(${stretch})`, offset: 0.45 },
        { transform: 'translateX(0) scaleX(1)' },
      ],
      {
        duration: motion ? 1 : 520,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
        fill: 'none',
      },
    )
  }, [activeIndex, items.length, ready])

  const bar = variant === 'bar'

  return (
    <div
      ref={listRef}
      className={`relative flex ${bar ? 'w-full items-center' : 'items-center gap-1'}`}
    >
      {/* Сама капсула — живёт под содержимым и перетекает между разделами */}
      <span
        ref={pillRef}
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 rounded-full opacity-0 transition-[left,width,top,height] duration-[520ms] ${
          bar
            ? 'bg-gold shadow-[0_6px_18px_rgba(138,112,83,0.4)]'
            : 'bg-white/12 backdrop-blur-sm'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-ios)', transformOrigin: 'center' }}
      />

      {items.map((item, index) => {
        const active = index === activeIndex

        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            aria-current={active ? 'page' : undefined}
            className={
              bar
                ? `press relative z-10 flex flex-1 flex-col items-center gap-1 rounded-full px-1 py-2 text-[0.625rem] font-medium transition-colors duration-300 ${
                    active ? 'text-white' : 'text-text-muted'
                  }`
                : `relative z-10 rounded-full px-4 py-2 text-sm transition-colors duration-300 ${
                    active ? 'text-on-dark' : 'text-on-dark-muted hover:text-on-dark'
                  }`
            }
          >
            {item.icon?.(active)}
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
