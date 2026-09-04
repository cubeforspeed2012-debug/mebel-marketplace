import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, getDict, isLocale, LOCALE_COOKIE, type Locale } from './i18n'

/** Язык страницы на сервере. Не выбран — русский. */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies()
    const value = store.get(LOCALE_COOKIE)?.value
    return isLocale(value) ? value : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export async function getDictionary() {
  return getDict(await getLocale())
}
