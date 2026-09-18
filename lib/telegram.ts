/**
 * Уведомления мастеру в Telegram.
 * Токен бота живёт только на сервере — в браузер он не попадает.
 * Если бот не настроен, заявка всё равно сохраняется: она видна в кабинете.
 */
/** Кнопка, открывающая мини-приложение прямо в Telegram. */
export type WebAppButton = { text: string; url: string }

function keyboard(button?: WebAppButton) {
  if (!button) return {}
  return {
    reply_markup: {
      inline_keyboard: [[{ text: button.text, web_app: { url: button.url } }]],
    },
  }
}

export async function notifyTelegram(
  chatId: string | null,
  text: string,
  button?: WebAppButton,
): Promise<boolean> {
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
        ...keyboard(button),
      }),
    })
    return response.ok
  } catch {
    // Telegram недоступен — не роняем заявку из-за этого.
    return false
  }
}

/**
 * Приветствие с картинкой. Первое, что видит мастер, — логотип, а не
 * стена текста: так понятнее, куда он попал.
 */
export async function sendPhotoTelegram(
  chatId: string | null,
  photo: string,
  caption: string,
  button?: WebAppButton,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chatId) return false

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo,
        caption,
        parse_mode: 'HTML',
        ...keyboard(button),
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Просит человека поделиться своим номером.
 *
 * Показываем не наше поле ввода, а встроенную кнопку Telegram: он сам
 * откроет своё окно «Поделиться номером с этим ботом?» и пришлёт тот
 * номер, на который зарегистрирован аккаунт. Вписать чужой нельзя —
 * в этом весь смысл проверки.
 */
export async function askPhoneTelegram(chatId: string | null, text: string): Promise<boolean> {
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
        reply_markup: {
          keyboard: [[{ text: '📱 Поделиться номером', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Сообщение, которое заодно убирает кнопку «Поделиться номером». */
export async function replyAndHideKeyboard(
  chatId: string | null,
  text: string,
  button?: WebAppButton,
): Promise<boolean> {
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
        // Кнопка своё отработала — убираем, чтобы не мозолила глаза
        reply_markup: button
          ? { inline_keyboard: [[{ text: button.text, web_app: { url: button.url } }]] }
          : { remove_keyboard: true },
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Экранирование, чтобы имя клиента вида «<Али>» не сломало разметку. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
