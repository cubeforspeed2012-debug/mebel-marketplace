'use server'

import { WORK_TYPES } from '@/lib/constants'
import { askGroq, extractJson } from '@/lib/groq'
import { getSellerContext } from '@/lib/session'

export type DescriptionState = {
  text?: string
  tips?: string[]
  error?: string
}

const SYSTEM = `Ты пишешь тексты для каталога мебельных мастеров Ташкента. Твоя работа — коротко и по-человечески рассказать о мастерской, чтобы покупатель захотел позвонить.

Отвечай строго объектом JSON, без пояснений и без markdown:
{"description": "текст", "tips": ["совет", "совет", "совет", "совет"]}

ТЕКСТ:
- Ровно 50–60 слов. Это примерно 3–4 предложения, один абзац. Не больше.
- По-русски, живым человеческим языком, как будто мастер рассказывает о себе знакомому.
- Первое предложение — что делаете и для кого. Дальше опыт, материалы, гарантия, сроки.
- Говори про мебель конкретно: кухни, шкафы-купе, фасады, столешницы, фурнитура, замер, сборка.
- Бери только то, что назвал мастер. Не выдумывай награды, число клиентов, цены и сроки.
- Запрещены штампы: «широкий ассортимент», «высокое качество по доступным ценам», «команда профессионалов», «индивидуальный подход».
- Без эмодзи, списков, заголовков и кавычек вокруг текста.

СОВЕТЫ:
- 4 штуки, каждый одно предложение до 110 знаков.
- Что мастеру доделать в профиле или в работе, чтобы звонили чаще: какие фото выложить, что дописать, что указать в цене.
- Опирайся на его ответы: не назвал гарантию — посоветуй указать; нет фото — посоветуй снять готовые кухни у клиента дома.
- Без общих слов вроде «развивайте бренд» и «делайте качественно».

Не рассуждай вслух и не показывай ход мыслей. Сразу выдай JSON.`

/** Собирает текст «О мастерской» и советы, как получать больше звонков. */
export async function suggestDescription(
  _prev: DescriptionState,
  formData: FormData,
): Promise<DescriptionState> {
  // Помощник только для своих: чужой человек не должен жечь наш лимит запросов
  await getSellerContext()

  const value = (key: string) => String(formData.get(key) ?? '').trim()

  const name = value('name')
  const workType = value('work_type')
  const years = value('years')
  const makes = value('makes')
  const materials = value('materials')
  const warranty = value('warranty')
  const term = value('term')
  const priceFrom = value('price_from')
  const advantages = value('advantages')
  const extra = value('extra')

  if (!makes && !years && !materials && !advantages) {
    return { error: 'Заполните хотя бы пару полей — иначе помощнику не из чего писать' }
  }

  const facts = [
    name && `Название мастерской: ${name}`,
    workType && `Чем занимается: ${WORK_TYPES[workType as keyof typeof WORK_TYPES] ?? workType}`,
    years && `Опыт работы: ${years}`,
    makes && `Что делает чаще всего: ${makes}`,
    materials && `Материалы и фурнитура: ${materials}`,
    warranty && `Гарантия: ${warranty}`,
    term && `Срок изготовления: ${term}`,
    priceFrom && `Цена начинается от: ${priceFrom}`,
    advantages && `Что входит и чем удобен: ${advantages}`,
    extra && `Ещё важное: ${extra}`,
    'Город: Ташкент',
  ]
    .filter(Boolean)
    .join('\n')

  const { text, error } = await askGroq(
    SYSTEM,
    `Ответы мастера:\n\n${facts}\n\nВерни только JSON.`,
    { json: true },
  )

  if (error) return { error }
  if (!text) return { error: 'Помощник вернул пустой ответ. Попробуйте ещё раз' }

  // Модель может обернуть ответ в ```json или добавить пояснение — берём сам объект
  const clean = extractJson(text)

  if (!clean) {
    return { error: 'Помощник ответил непонятно. Нажмите «Написать текст» ещё раз' }
  }

  try {
    const parsed = JSON.parse(clean) as { description?: string; tips?: unknown }
    const description = parsed.description?.trim()
    const tips = Array.isArray(parsed.tips)
      ? parsed.tips.map((tip) => String(tip).trim()).filter(Boolean).slice(0, 6)
      : []

    if (!description) throw new Error('пустое описание')

    return { text: description.replace(/^["«»\']+|["«»\']+$/g, '').trim(), tips }
  } catch {
    // Разобрать не вышло — лучше честно попросить повторить, чем показать мусор
    return { error: 'Помощник ответил непонятно. Нажмите «Написать текст» ещё раз' }
  }
}
