'use server'

import { WORK_TYPES } from '@/lib/constants'
import { askGroq } from '@/lib/groq'
import { getSellerContext } from '@/lib/session'

export type DescriptionState = { text?: string; error?: string }

const SYSTEM = `Ты помогаешь мебельным мастерам Ташкента написать текст о своей мастерской для каталога.

Правила:
- Пиши по-русски, простым живым языком, без канцелярита и без рекламных штампов вроде «широкий ассортимент», «высокое качество по доступным ценам», «команда профессионалов».
- 3–5 предложений, 350–600 знаков. Один абзац.
- Только факты, которые дал мастер. Ничего не выдумывай: не пиши про награды, сертификаты, количество клиентов и сроки, если их не назвали.
- Обращение к читателю на «вы». О себе — от первого лица множественного числа («делаем», «работаем») или без лица.
- Не используй эмодзи, списки, заголовки и кавычки-ёлочки в начале текста.
- В ответе верни только сам текст, без пояснений.`

/** Сочиняет текст «О мастерской» из коротких ответов мастера. */
export async function suggestDescription(
  _prev: DescriptionState,
  formData: FormData,
): Promise<DescriptionState> {
  // Помощник только для своих: чужой человек не должен жечь наш лимит запросов
  await getSellerContext()

  const years = String(formData.get('years') ?? '').trim()
  const workType = String(formData.get('work_type') ?? '').trim()
  const makes = String(formData.get('makes') ?? '').trim()
  const materials = String(formData.get('materials') ?? '').trim()
  const warranty = String(formData.get('warranty') ?? '').trim()
  const extra = String(formData.get('extra') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()

  if (!makes && !years && !materials) {
    return { error: 'Заполните хотя бы пару полей — иначе помощнику не из чего писать' }
  }

  const facts = [
    name && `Название мастерской: ${name}`,
    years && `Опыт работы: ${years}`,
    workType &&
      `Чем занимается: ${WORK_TYPES[workType as keyof typeof WORK_TYPES] ?? workType}`,
    makes && `Что делает: ${makes}`,
    materials && `Материалы и фурнитура: ${materials}`,
    warranty && `Гарантия: ${warranty}`,
    extra && `Ещё важное: ${extra}`,
    'Город: Ташкент',
  ]
    .filter(Boolean)
    .join('\n')

  const { text, error } = await askGroq(SYSTEM, `Напиши текст о мастерской.\n\n${facts}`)

  if (error) return { error }

  // Иногда модель оборачивает ответ в кавычки — убираем, чтобы не вставлять их в профиль
  return { text: text?.replace(/^["«»']+|["«»']+$/g, '').trim() }
}
