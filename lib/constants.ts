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

/** +998903198638 → +998 90 319-86-38 */
export function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  const m = digits.match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/)
  return m ? `+998 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : phone
}
