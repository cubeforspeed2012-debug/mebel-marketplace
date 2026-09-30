import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { NextRequest } from 'next/server'

/**
 * Ограничитель запросов: сколько раз один адрес может стучаться к сайту.
 *
 * Сайт живёт на Cloudflare, и сетевые атаки (SYN-флуд, ботнеты) Cloudflare
 * отсекает сам, до нас они не долетают. Но есть атака попроще: скрипт с
 * одного адреса открывает страницы тысячами раз в секунду. Каждая такая
 * страница — это запрос к базе, и база на бесплатном тарифе от напора
 * замолкает для всех. Здесь мы считаем запросы по адресу и лишние
 * отвечаем «слишком часто» ещё до похода в базу.
 *
 * Счётчики ведёт сам Cloudflare (см. ratelimits в wrangler.jsonc), нам
 * они достаются как привязки окружения. Локально, без Cloudflare, привязок
 * нет — тогда ничего не ограничиваем.
 *
 * Два лимита:
 *   PAGES  — любые запросы: 100 за 10 секунд. Человек столько не накликает
 *            даже с подгрузкой соседних разделов, а скрипту этого мало.
 *   WRITES — POST: вход, регистрация, сохранение работ и заявок. 40 в минуту.
 *            Тут же живёт перебор паролей и спам заявками.
 */

type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> }
type Env = { RATE_PAGES?: Limiter; RATE_WRITES?: Limiter }

function limiters(): Env {
  try {
    return getCloudflareContext().env as unknown as Env
  } catch {
    return {}
  }
}

/** Кому не считаем: серверам Telegram — они шлют сообщения бота. */
const EXEMPT_PREFIXES = ['/api/telegram']

/**
 * Возвращает ответ «слишком часто», если адрес превысил лимит,
 * и ничего — если можно пропускать дальше.
 */
export async function tooManyRequests(request: NextRequest): Promise<Response | null> {
  const path = request.nextUrl.pathname
  if (EXEMPT_PREFIXES.some((p) => path.startsWith(p))) return null

  const ip = request.headers.get('cf-connecting-ip')
  if (!ip) return null

  const env = limiters()
  const checks: Promise<{ success: boolean }>[] = []
  if (env.RATE_PAGES) checks.push(env.RATE_PAGES.limit({ key: ip }))
  if (env.RATE_WRITES && request.method !== 'GET' && request.method !== 'HEAD') {
    checks.push(env.RATE_WRITES.limit({ key: ip }))
  }
  if (!checks.length) return null

  let allowed = true
  try {
    const results = await Promise.all(checks)
    allowed = results.every((r) => r.success)
  } catch {
    // Ограничитель не ответил — пропускаем, сайт важнее подсчёта.
    return null
  }
  if (allowed) return null

  return new Response(TOO_MANY_HTML, {
    status: 429,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'retry-after': '10',
      'cache-control': 'no-store',
    },
  })
}

const TOO_MANY_HTML = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Слишком много запросов</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f2f2f5;color:#18181b}
main{max-width:420px;padding:32px;text-align:center}h1{font-size:22px;margin:0 0 12px}p{margin:0;color:#52525b;line-height:1.5}b{color:#b4671f}</style></head>
<body><main><h1>Слишком много запросов</h1>
<p>С вашего адреса пришло слишком много запросов подряд. Подождите несколько секунд и обновите страницу.</p>
<p style="margin-top:12px">Sizning manzilingizdan juda ko'p so'rov keldi. Bir necha soniya kutib, sahifani yangilang.</p>
<p style="margin-top:20px"><b>Mebel</b> · top-mebel.uz</p></main></body></html>`
