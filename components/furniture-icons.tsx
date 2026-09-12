/*
 * Мебельные значки — свои, в одну линию, одной толщины.
 * Категории, пустые места без фото и подсказки должны читаться
 * как одна семья, а не как набор случайных картинок из интернета.
 */

type IconProps = { className?: string; strokeWidth?: number }

function Base({
  className = 'size-5',
  strokeWidth = 1.6,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Кухня: шкафы с вытяжкой */
export function IconKitchen(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 12.5h17v8h-17z" />
      <path d="M8.5 12.5v8M15.5 12.5v8M6 16.5h.01M18 16.5h.01" />
      <path d="M7 3.5h10l1.5 5h-13z" />
      <path d="M12 8.5v4" />
    </Base>
  )
}

/** Спальня и гостиная: диван */
export function IconSofa(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 11V8.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V11" />
      <path d="M3.5 13.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V17h-17z" />
      <path d="M5.5 17v2M18.5 17v2M12 11.5V17" />
    </Base>
  )
}

/** Офис: стол с лампой */
export function IconDesk(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 11.5h18" />
      <path d="M5 11.5v8M19 11.5v8M5 15.5h6" />
      <path d="M14 11.5V9l3-3.5h2.5" />
      <path d="M12.5 9h4" />
    </Base>
  )
}

/** Детская: кроватка */
export function IconCrib(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7v13M20 7v13" />
      <path d="M4 10h16M4 16h16" />
      <path d="M8 10v6M12 10v6M16 10v6" />
      <path d="M4 20h2M18 20h2" />
    </Base>
  )
}

/** Шкаф */
export function IconWardrobe(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="3.5" width="14" height="16" rx="1.5" />
      <path d="M12 3.5v16M9.5 11v2M14.5 11v2M7 19.5v1.5M17 19.5v1.5" />
    </Base>
  )
}

/** Кресло — для мест, где фото ещё нет */
export function IconArmchair(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6.5 11V7a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v4" />
      <path d="M4.5 12.5a2 2 0 0 1 2-2h.5v3h10v-3h.5a2 2 0 0 1 2 2V18h-15z" />
      <path d="M6.5 18v2M17.5 18v2" />
    </Base>
  )
}

/** Значок по slug категории — чтобы чипы на главной и в каталоге были с картинкой */
export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  if (slug === 'kitchens') return <IconKitchen className={className} />
  if (slug === 'bedroom-living') return <IconSofa className={className} />
  if (slug === 'office') return <IconDesk className={className} />
  if (slug === 'kids') return <IconCrib className={className} />
  return <IconWardrobe className={className} />
}

/**
 * Большая линейная картинка для пустых мест: диван, торшер, растение.
 * Рисуется цветом текста с прозрачностью, поэтому одинаково уместна
 * и на тёмном, и на светлом.
 */
export function FurnitureScene({ className = 'h-32 w-auto' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 120"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* пол */}
      <path d="M12 104h216" opacity="0.5" />
      {/* диван */}
      <path d="M62 78V56a8 8 0 0 1 8-8h60a8 8 0 0 1 8 8v22" />
      <path d="M50 84a8 8 0 0 1 8-8h6v8h72v-8h6a8 8 0 0 1 8 8v20H50z" />
      <path d="M56 104v6M144 104v6M100 76v8" />
      <path d="M70 66h24M106 66h24" opacity="0.5" />
      {/* торшер */}
      <path d="M186 104V54" />
      <path d="M174 54h24l-4-16h-16z" />
      <path d="M176 104h20" />
      {/* растение */}
      <path d="M22 104v-14" />
      <path d="M16 104h12l2-10H14z" />
      <path d="M22 90c-8-2-12-8-10-16 8 2 12 8 10 16z" />
      <path d="M22 90c8-2 12-8 10-16-8 2-12 8-10 16z" />
      <path d="M22 88c-2-8 0-14 6-18" opacity="0.6" />
      {/* картина */}
      <rect x="84" y="18" width="40" height="22" rx="1.5" opacity="0.7" />
      <path d="M90 34l8-8 6 6 5-4 9 6" opacity="0.7" />
    </svg>
  )
}
