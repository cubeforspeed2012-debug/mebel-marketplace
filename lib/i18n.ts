import { ru } from './dictionaries/ru'
import { uz } from './dictionaries/uz'

export type Locale = 'ru' | 'uz'
export type Dict = typeof ru

export const LOCALES: Locale[] = ['ru', 'uz']
export const DEFAULT_LOCALE: Locale = 'ru'

/** Выбранный язык живёт в куке — без префиксов в адресе, ссылки остаются прежними */
export const LOCALE_COOKIE = 'lang'

export const DICTS: Record<Locale, Dict> = { ru, uz }

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'ru' || value === 'uz'
}

export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? ru
}

/** Цена на языке страницы: 12500000 → «12 500 000 сум» / «12 500 000 so'm» */
export function priceIn(dict: Dict, price: number | null, priceFrom = false): string {
  if (price === null || price === undefined) return dict.common.priceOnRequest
  const formatted = new Intl.NumberFormat('ru-RU').format(price)

  // По-узбекски «от» ставится после числа: «12 500 000 so'm dan»
  if (dict.code === 'uz') {
    return `${formatted} ${dict.common.currency}${priceFrom ? ` ${dict.common.from}` : ''}`
  }
  return `${priceFrom ? `${dict.common.from} ` : ''}${formatted} ${dict.common.currency}`
}

/** Район на языке страницы. В базе районы хранятся по-русски. */
export function districtIn(dict: Dict, district: string | null): string {
  if (!district) return ''
  return (dict.districts as Record<string, string>)[district] ?? district
}
