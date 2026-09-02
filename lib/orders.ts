/**
 * Этапы работы мебельщика с клиентом — воронка CRM.
 * Порядок здесь = порядок колонок на доске заказов.
 */
export const ORDER_STATUSES = {
  new: 'Новая заявка',
  contacted: 'Созвонились',
  measurement: 'Замер',
  in_progress: 'В работе',
  done: 'Готово',
  cancelled: 'Отказ',
} as const

export type OrderStatus = keyof typeof ORDER_STATUSES

/** Колонки доски: «Отказ» держим отдельно, чтобы не мозолил глаза. */
export const BOARD_STATUSES: OrderStatus[] = [
  'new',
  'contacted',
  'measurement',
  'in_progress',
  'done',
]

/** Цвет метки этапа. Заявка кричит золотом, отказ — тихий серый. */
export const STATUS_STYLES: Record<OrderStatus, string> = {
  new: 'bg-gold text-ink',
  contacted: 'bg-ink text-on-dark',
  measurement: 'bg-cream text-text border border-line',
  in_progress: 'bg-cream text-text border border-line',
  done: 'bg-green-700 text-white',
  cancelled: 'bg-neutral-300 text-neutral-700',
}

export const ORDER_SOURCES = {
  site: 'С сайта',
  phone: 'Звонок',
  instagram: 'Instagram',
  telegram: 'Telegram',
  manual: 'Вручную',
} as const

export type OrderSource = keyof typeof ORDER_SOURCES
