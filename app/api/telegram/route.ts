import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTelegram } from '@/lib/telegram'

/**
 * Сюда стучится Telegram, когда мастер нажимает «Подключить» и попадает
 * в бота по ссылке вида t.me/бот?start=код.
 *
 * Только это и умеем: поймать /start с кодом, привязать чат к мастерской
 * и ответить человеку. Никаких других команд бот не обрабатывает.
 */
export async function POST(request: NextRequest) {
  // Секрет задаётся при регистрации адреса у Telegram. Без него кто угодно
  // мог бы слать сюда выдуманные сообщения.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new NextResponse('нет доступа', { status: 401 })
  }

  let update: {
    message?: { text?: string; chat?: { id?: number | string } }
  }

  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const chatId = update.message?.chat?.id
  const text = (update.message?.text ?? '').trim()
  if (!chatId) return NextResponse.json({ ok: true })

  const code = /^\/start\s+(\S+)$/.exec(text)?.[1]

  if (!code) {
    await notifyTelegram(
      String(chatId),
      'Чтобы получать заявки сюда, откройте кабинет мастера на Mebel и нажмите «Подключить Telegram».',
    )
    return NextResponse.json({ ok: true })
  }

  try {
    const supabase = await createClient()
    const { data: company } = await supabase.rpc('link_telegram', {
      p_code: code,
      p_chat_id: String(chatId),
    })

    await notifyTelegram(
      String(chatId),
      company
        ? `<b>Готово.</b> Заявки мастерской «${company}» будут приходить сюда.`
        : 'Ссылка устарела. Откройте кабинет мастера и нажмите «Подключить Telegram» ещё раз — она действует 15 минут.',
    )
  } catch {
    // Telegram повторит доставку сам — молчим, чтобы не сыпать ошибками.
  }

  return NextResponse.json({ ok: true })
}
