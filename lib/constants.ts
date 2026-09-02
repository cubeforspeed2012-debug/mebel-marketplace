/** Районы Ташкента — для фильтра каталога и профиля продавца. */
export const DISTRICTS = [
  'Алмазарский',
  'Бектемирский',
  'Мирабадский',
  'Мирзо-Улугбекский',
  'Сергелийский',
  'Учтепинский',
  'Чиланзарский',
  'Шайхантахурский',
  'Юнусабадский',
  'Яккасарайский',
  'Янгихаётский',
  'Яшнабадский',
] as const

export type District = (typeof DISTRICTS)[number]

/** Чем занимается компания — выбирается при создании профиля. */
export const WORK_TYPES = {
  ready_made: 'Готовая мебель',
  custom: 'Мебель на заказ',
  both: 'Готовая и на заказ',
} as const

export type WorkType = keyof typeof WORK_TYPES

/** Тип конкретного товара в каталоге. */
export const PRODUCT_TYPES = {
  ready_made: 'Готовая',
  custom_order: 'На заказ',
} as const

export type ProductType = keyof typeof PRODUCT_TYPES

/**
 * Категории продублированы из БД, чтобы страница фильтров отрисовалась
 * даже если Supabase-проект «спит» (бесплатный тариф засыпает после недели простоя).
 */
export const FALLBACK_CATEGORIES = [
  { slug: 'kitchens', name: 'Кухни' },
  { slug: 'bedroom-living', name: 'Спальни и гостиные' },
  { slug: 'office', name: 'Офисная мебель' },
  { slug: 'kids', name: 'Детская мебель' },
]

/** Форматирование цены: 12500000 → «12 500 000 сум» */
export function formatPrice(price: number | null, priceFrom = false): string {
  if (price === null || price === undefined) return 'Цена по запросу'
  const formatted = new Intl.NumberFormat('ru-RU').format(price)
  return `${priceFrom ? 'от ' : ''}${formatted} сум`
}

/**
 * Приводит любой ввод к единому виду +998XXXXXXXXX.
 * Мастера пишут по-разному: «90 319 86 38», «+998901234567», «903198638» —
 * а звонок по ссылке наберётся только из правильного номера.
 */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null

  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00998')) digits = digits.slice(2)
  if (digits.startsWith('8') && digits.length === 10) digits = `998${digits.slice(1)}`
  if (digits.length === 9) digits = `998${digits}` // местный номер без кода страны

  return digits.length >= 9 ? `+${digits}` : phone
}

/** +998903198638 → +998 90 319-86-38 */
export function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')

  const full = digits.match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/)
  if (full) return `+998 ${full[1]} ${full[2]}-${full[3]}-${full[4]}`

  const local = digits.match(/^(\d{2})(\d{3})(\d{2})(\d{2})$/)
  if (local) return `+998 ${local[1]} ${local[2]}-${local[3]}-${local[4]}`

  return phone
}

/** Ссылка для кнопки «Позвонить» — номер в наборном виде. */
export function telHref(phone: string | null): string {
  return `tel:${normalizePhone(phone) ?? ''}`
}
