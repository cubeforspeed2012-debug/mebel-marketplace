/**
 * Уведомления мастеру в Telegram.
 * Токен бота живёт только на сервере — в браузер он не попадает.
 * Если бот не настроен, заявка всё равно сохраняется: она видна в кабинете.
 */
export async function notifyTelegram(chatId: string | null, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chatId) return false

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    return response.ok
  } catch {
    // Telegram недоступен — не роняем заявку из-за этого.
    return false
  }
}

/** Экранирование, чтобы имя клиента вида «<Али>» не сломало разметку. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
