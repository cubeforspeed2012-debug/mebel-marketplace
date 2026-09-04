'use client'

import { createContext, useContext } from 'react'
import { ru } from '@/lib/dictionaries/ru'
import type { Dict } from '@/lib/i18n'

/* Словарь приходит с сервера один раз и лежит в контексте:
   так клиентские части не лезут за языком сами и не мигают при загрузке. */
const DictContext = createContext<Dict>(ru)

export function LocaleProvider({ dict, children }: { dict: Dict; children: React.ReactNode }) {
  return <DictContext.Provider value={dict}>{children}</DictContext.Provider>
}

export function useDict() {
  return useContext(DictContext)
}
