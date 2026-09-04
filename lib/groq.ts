/**
 * Помощник на Groq — бесплатный и быстрый. Ключ живёт только в секретах
 * Cloudflare: запрос уходит с сервера, в браузер ключ не попадает никогда.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare'

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * Groq время от времени выводит модели из обращения. Держим список:
 * если первая отвечает «нет такой модели», пробуем следующую,
 * чтобы помощник не умирал молча в день, когда её отключили.
 */
const MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
]

/** Какие модели вообще доступны по этому ключу — на случай, если наши отключили. */
async function discoverModel(key: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return null

    const data = (await response.json()) as { data?: { id?: string }[] }
    const ids = (data.data ?? []).map((model) => model.id ?? '')

    // Отсеиваем распознавание речи и модели-цензоры — они текст не пишут
    const chat = ids.find(
      (id) => id && !/whisper|guard|tts|vision|embed/i.test(id) && !MODELS.includes(id),
    )
    return chat ?? null
  } catch {
    return null
  }
}

export type AiResult = { text?: string; error?: string }

/**
 * Вытаскивает объект JSON из ответа модели. Модели любят обернуть ответ
 * в ```json, добавить «Вот ваш текст:» или размышления — берём то,
 * что между первой { и последней }.
 */
export function extractJson(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

/**
 * Ключ достаём двумя путями. На Cloudflare секреты лежат в окружении воркера,
 * и не в каждой сборке они попадают в process.env — поэтому если там пусто,
 * спрашиваем окружение напрямую. Иначе рабочий ключ выглядел бы как отсутствующий.
 */
async function readKey(): Promise<string | undefined> {
  const fromProcess = process.env.GROQ_API_KEY
  if (fromProcess) return fromProcess

  try {
    const { env } = getCloudflareContext()
    return (env as unknown as { GROQ_API_KEY?: string }).GROQ_API_KEY
  } catch {
    return undefined
  }
}

/** Есть ли ключ. Само значение наружу не отдаём — только да или нет. */
export async function hasAiKey(): Promise<boolean> {
  return Boolean(await readKey())
}

export async function askGroq(
  system: string,
  user: string,
  { json = false }: { json?: boolean } = {},
): Promise<AiResult> {
  const key = await readKey()

  if (!key) {
    return { error: 'Помощник ещё не подключён — нужен ключ Groq в настройках сайта' }
  }

  let lastError = 'Помощник не ответил. Попробуйте ещё раз'

  // Если Groq отключил все знакомые модели — спрашиваем у него живой список
  const discovered = await discoverModel(key)
  const models = discovered ? [...MODELS, discovered] : MODELS

  for (const model of models) {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          max_tokens: 900,
          // Просим сразу строгий JSON — тогда модель не рассуждает вслух
          ...(json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        // Ждём недолго: человек стоит у экрана, а не пьёт чай
        signal: AbortSignal.timeout(25000),
      })

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: { message?: { content?: string; reasoning?: string } }[]
        }
        const message = data.choices?.[0]?.message
        const content = (message?.content ?? '').trim()

        if (content) return { text: content }

        /*
         * Пусто в content бывает у «рассуждающих» моделей: они пишут ход мыслей
         * в reasoning. Показывать эти мысли человеку нельзя — но если внутри
         * оказался готовый JSON, ответ можно спасти.
         */
        const rescued = json ? extractJson(message?.reasoning ?? '') : null
        if (rescued) return { text: rescued }

        lastError = 'Помощник вернул пустой ответ. Попробуйте ещё раз'
        continue
      }

      if (response.status === 401 || response.status === 403) {
        return { error: 'Ключ помощника не принят. Проверьте ключ Groq в настройках сайта' }
      }
      if (response.status === 429) {
        return { error: 'Помощник занят — слишком много запросов. Попробуйте через минуту' }
      }

      // Модель отключили или переименовали — пробуем следующую из списка
      const detail = await response.text()
      lastError = `Помощник не ответил (${response.status}). Попробуйте ещё раз`

      if (response.status === 404 || /model/i.test(detail)) continue

      return { error: lastError }
    } catch {
      lastError = 'Помощник не отвечает. Попробуйте ещё раз через минуту'
    }
  }

  return { error: lastError }
}
