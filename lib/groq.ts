/**
 * Помощник на Groq — бесплатный и быстрый. Ключ живёт только в секретах
 * Cloudflare: запрос уходит с сервера, в браузер ключ не попадает никогда.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare'

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

export type AiResult = { text?: string; error?: string }

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

export async function askGroq(system: string, user: string): Promise<AiResult> {
  const key = await readKey()

  if (!key) {
    return { error: 'Помощник ещё не подключён — нужен ключ Groq в настройках сайта' }
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 600,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      // Ждём недолго: человек стоит у экрана, а не пьёт чай
      signal: AbortSignal.timeout(20000),
    })

    if (response.status === 401 || response.status === 403) {
      return { error: 'Ключ помощника не принят. Проверьте ключ Groq в настройках сайта' }
    }
    if (response.status === 429) {
      return { error: 'Помощник занят — слишком много запросов. Попробуйте через минуту' }
    }
    if (!response.ok) {
      return { error: 'Помощник не ответил. Попробуйте ещё раз' }
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const text = data.choices?.[0]?.message?.content?.trim()

    return text ? { text } : { error: 'Помощник вернул пустой ответ. Попробуйте ещё раз' }
  } catch {
    return { error: 'Помощник не отвечает. Попробуйте ещё раз через минуту' }
  }
}
