/**
 * Telegram Gateway — официальная отправка кодов подтверждения.
 *
 * Код приходит человеку в Telegram от чата «Verification Codes» с синей
 * галочкой — тот же, через который коды шлют банки и Яндекс. Нашего бота
 * открывать не нужно. Платим только за доставленные коды.
 *
 * Токен — в секретах Cloudflare (TELEGRAM_GATEWAY_TOKEN), в коде его нет.
 * Нет токена — функция выключена, и сайт предлагает прежний способ
 * через нашего бота.
 */

const API = 'https://gatewayapi.telegram.org'

export type GatewayStatus = {
  request_id: string
  phone_number: string
  verification_status?: { status: string }
}

export function gatewayEnabled() {
  return Boolean(process.env.TELEGRAM_GATEWAY_TOKEN)
}

async function call(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_GATEWAY_TOKEN
  if (!token) return { ok: false as const, error: 'NOT_CONFIGURED' }

  try {
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as { ok: boolean; result?: GatewayStatus; error?: string }
    if (!data.ok || !data.result) return { ok: false as const, error: data.error ?? 'UNKNOWN' }
    return { ok: true as const, result: data.result }
  } catch {
    return { ok: false as const, error: 'NETWORK' }
  }
}

/** Номер из профиля → +998XXXXXXXXX. Девять цифр — значит, записан без кода страны. */
export function toE164(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 9) return `+998${digits}`
  return `+${digits}`
}

/** Код придумывает сам Telegram: мы его не знаем и нигде не храним. */
export function sendVerificationCode(phoneE164: string) {
  return call('sendVerificationMessage', {
    phone_number: phoneE164,
    code_length: 6,
    ttl: 300,
  })
}

/** Спрашиваем у Telegram, верен ли код. В ответе — номер, на который он ушёл. */
export function checkVerificationCode(requestId: string, code: string) {
  return call('checkVerificationStatus', { request_id: requestId, code })
}
