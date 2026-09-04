'use server'

import { WORK_TYPES } from '@/lib/constants'
import { askGroq } from '@/lib/groq'
import { getSellerContext } from '@/lib/session'

export type DescriptionState = {
  text?: string
  tips?: string[]
  error?: string
}

const SYSTEM = `Ты помогаешь мебельным мастерам Ташкента заполнить профиль так, чтобы им чаще звонили.

Ты получаешь ответы мастера и возвращаешь строгий JSON без пояснений и без markdown:
{"description": "текст о мастерской", "tips": ["совет", "совет", "совет", "совет", "совет"]}

ТЕКСТ О МАСТЕРСКОЙ:
- По-русски, простым живым языком. 3–5 предложений, 350–650 знаков, один абзац.
- Начинай с того, что человек ищет: что вы делаете и для кого. Опыт, материалы и гарантия — дальше.
- Обязательно вплети то, что снимает страх покупателя: договор, гарантия, сроки, бесплатный замер, своё производство — но только если мастер это назвал.
- Запрещены штампы: «широкий ассортимент», «высокое качество по доступным ценам», «команда профессионалов», «индивидуальный подход», «мы лучшие».
- Ничего не выдумывай. Нет данных о наградах, числе клиентов, сроках — не пиши о них.
- Без эмодзи, списков, заголовков и кавычек вокруг текста.

СОВЕТЫ:
- 4–6 штук, каждый — одно короткое предложение, максимум 110 знаков.
- Только то, что мастер может сделать сам на этой площадке или в своей работе: какие фото выложить, что дописать в профиль, что указать в цене, о чём спросить клиента при звонке.
- Опирайся на его ответы: если он не назвал гарантию — посоветуй её указать; если нет фото — посоветуй снять готовые работы у клиента дома.
- Пиши конкретно и по делу, без общих слов вроде «делайте качественно» и «развивайте бренд».
- Учитывай Ташкент: люди звонят и пишут в Telegram, сравнивают по фото и цене, боятся сорванных сроков и предоплаты.`

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
  )

  if (error) return { error }
  if (!text) return { error: 'Помощник вернул пустой ответ. Попробуйте ещё раз' }

  // Модель иногда оборачивает JSON в ```json — вырезаем оболочку перед разбором
  const clean = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()

  try {
    const parsed = JSON.parse(clean) as { description?: string; tips?: unknown }
    const description = parsed.description?.trim()
    const tips = Array.isArray(parsed.tips)
      ? parsed.tips.map((tip) => String(tip).trim()).filter(Boolean).slice(0, 6)
      : []

    if (!description) throw new Error('пустое описание')

    return { text: description.replace(/^["«»']+|["«»']+$/g, '').trim(), tips }
  } catch {
    // Не разобрали JSON — отдаём хотя бы текст, чтобы работа мастера не пропала
    return { text: clean.replace(/^["«»']+|["«»']+$/g, '').trim(), tips: [] }
  }
}
