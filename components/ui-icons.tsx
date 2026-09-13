/* Значки интерфейса — одна линия, одна толщина, один размер. */

type Props = { className?: string }

function Base({ className = 'size-5', children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export const IconStore = (p: Props) => (
  <Base {...p}>
    <path d="M4 9.5V20h16V9.5" />
    <path d="M3 9.5 5 4h14l2 5.5a3 3 0 0 1-5.6 1.6A3 3 0 0 1 12 12a3 3 0 0 1-3.4-.9A3 3 0 0 1 3 9.5Z" />
    <path d="M9.5 20v-5.5h5V20" />
  </Base>
)

export const IconPhotos = (p: Props) => (
  <Base {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <circle cx="8.5" cy="10" r="1.4" />
    <path d="m5 16.5 4-4 3.5 3.5 2.5-2 4 3.5" />
  </Base>
)

export const IconOrders = (p: Props) => (
  <Base {...p}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
    <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
  </Base>
)

export const IconChart = (p: Props) => (
  <Base {...p}>
    <path d="M4 19.5h16" />
    <path d="M7.5 16.5V11M12 16.5V6.5M16.5 16.5v-3.5" />
  </Base>
)

export const IconRocket = (p: Props) => (
  <Base {...p}>
    <path d="M13.5 4.5c3.5 1 6 3.5 6.5 7l-6 6-5-5 4.5-8Z" />
    <path d="M9 15.5 5.5 19M7 12l-2.5 1.5M12 17l-1.5 2.5" />
    <circle cx="14.5" cy="9.5" r="1.4" />
  </Base>
)

export const IconUser = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" />
  </Base>
)

export const IconGear = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
  </Base>
)

export const IconGlobe = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" />
  </Base>
)

export const IconMoon = (p: Props) => (
  <Base {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Base>
)

export const IconLock = (p: Props) => (
  <Base {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Base>
)

export const IconDoc = (p: Props) => (
  <Base {...p}>
    <path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M13 3.5v5h5M8.5 13h7M8.5 16.5h5" />
  </Base>
)

export const IconShield = (p: Props) => (
  <Base {...p}>
    <path d="M12 3.5 19 6v6c0 4-3 7-7 8.5C8 19 5 16 5 12V6l7-2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </Base>
)

export const IconHelp = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.7 9.5a2.4 2.4 0 1 1 3 2.3v1.4" />
    <path d="M12.7 16.6h-.01" />
  </Base>
)

export const IconMail = (p: Props) => (
  <Base {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="m4.5 8 7.5 5 7.5-5" />
  </Base>
)

export const IconPanel = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v8.5h8.5" />
  </Base>
)

export const IconRequests = (p: Props) => (
  <Base {...p}>
    <path d="M20.5 12.5a8 8 0 0 1-11.6 7.1L4 20.5l1-4.7A8 8 0 1 1 20.5 12.5Z" />
    <path d="M9 11h6M9 14.5h3.5" />
  </Base>
)

export const IconTrash = (p: Props) => (
  <Base {...p}>
    <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5 7.5 20h9l1-13.5" />
    <path d="M10.5 10v6M13.5 10v6" />
  </Base>
)

export const IconChevron = ({ className = 'size-4' }: Props) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}
       strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m9 5 7 7-7 7" />
  </svg>
)

export const IconBack = ({ className = 'size-5' }: Props) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}
       strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m15 5-7 7 7 7" />
  </svg>
)
