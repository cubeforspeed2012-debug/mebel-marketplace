import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/constants'
import {
  askPhoneTelegram,
  escapeHtml,
  notifyTelegram,
  replyAndHideKeyboard,
  sendPhotoTelegram,
} from '@/lib/telegram'

/** Что бот умеет: привязать мастерскую и подтвердить номер. Больше ничего. */
const OPEN_APP = { text: 'Открыть кабинет', url: `${SITE_URL}/tg` }

/**
 * Текст, который человек видит перед тем, как поделиться номером.
 *
 * Прямо называем то, чего мы никогда не спросим: именно по этим четырём
 * вещам люди отличают мошенника, и честно сказать о них — единственный
 * способ выглядеть не как мошенник.
 */
const PHONE_ASK = [
  '<b>Подтверждение номера</b>',
  '',
  'Нажмите кнопку ниже — Telegram сам пришлёт нам номер, на который',
  'зарегистрирован ваш аккаунт. Мы сверим его с номером в мастерской',
  'и поставим в каталоге отметку «номер проверен».',
  '',
  'Клиенты доверяют таким мастерским больше.',
  '',
  '<i>Мы никогда не просим пароль, код из СМС, номер карты и деньги.</i>',
].join('\n')

export async function POST(request: NextRequest) {
  // Секрет задаётся при регистрации адреса у Telegram. Без него кто угодно
  // мог бы слать сюда выдуманные сообщения.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new NextResponse('нет доступа', { status: 401 })
  }

  let update: {
    message?: {
      text?: string
      from?: { id?: number }
      chat?: { id?: number | string }
      contact?: { phone_number?: string; user_id?: number }
    }
  }

  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const message = update.message
  const chatId = message?.chat?.id
  if (!chatId) return NextResponse.json({ ok: true })

  const chat = String(chatId)

  // ── Человек поделился номером ──────────────────────────────────────
  const contact = message?.contact
  if (contact) {
    await handleContact(chat, contact, message?.from?.id)
    return NextResponse.json({ ok: true })
  }

  const text = (message?.text ?? '').trim()
  const startArg = /^\/start(?:\s+(\S+))?$/.exec(text)?.[1]

  // ── Пришёл по кнопке «Подтвердить номер» из кабинета ───────────────
  if (startArg === 'phone') {
    await askPhoneTelegram(chat, PHONE_ASK)
    return NextResponse.json({ ok: true })
  }

  // ── Просто открыл бота ─────────────────────────────────────────────
  if (!startArg) {
    await sendPhotoTelegram(
      chat,
      `${SITE_URL}/logo-tg.png`,
      [
        '<b>Mebel — мебель Ташкента</b>',
        '',
        'Здесь мастер видит свои заявки и цифры, не выходя из Telegram:',
        'кто оставил заявку, кто смотрел страницу, кто хотел позвонить.',
        '',
        'Нажмите кнопку ниже — откроется кабинет.',
      ].join('\n'),
      OPEN_APP,
    )

    /*
     * И сразу просим номер, если он ещё не подтверждён. Так это устроено
     * везде, где номер проверяют через Telegram: человек открыл бота —
     * бот сам попросил, кнопка уже на экране. Искать её в кабинете
     * мастер не пойдёт, а значит и не подтвердит никогда.
     */
    try {
      const supabase = await createClient()
      const { data: needsPhone } = await supabase.rpc('tg_needs_phone', { p_chat_id: chat })
      if (needsPhone) await askPhoneTelegram(chat, PHONE_ASK)
    } catch {
      // Не смогли спросить сейчас — спросим при следующем заходе
    }

    return NextResponse.json({ ok: true })
  }

  // ── Пришёл по одноразовой ссылке привязки ──────────────────────────
  try {
    const supabase = await createClient()
    const { data: company } = await supabase.rpc('link_telegram', {
      p_code: startArg,
      p_chat_id: chat,
    })

    await notifyTelegram(
      chat,
      company
        ? `<b>Готово.</b> Заявки мастерской «${escapeHtml(String(company))}» будут приходить сюда.`
        : 'Ссылка устарела. Откройте кабинет мастера и нажмите «Подключить Telegram» ещё раз — она действует 15 минут.',
      company ? OPEN_APP : undefined,
    )

    // Мастер только что подключился и он здесь, в разговоре. Просить его
    // отдельно вернуться и нажать ещё одну кнопку — значит потерять почти
    // всех: до второго шага не доходят. Спрашиваем номер сразу, пока он тут.
    if (company) {
      const { data: needsPhone } = await supabase.rpc('tg_needs_phone', { p_chat_id: chat })
      if (needsPhone) await askPhoneTelegram(chat, PHONE_ASK)
    }
  } catch {
    // Telegram повторит доставку сам — молчим, чтобы не сыпать ошибками.
  }

  return NextResponse.json({ ok: true })
}

/**
 * Разбираем присланный номер.
 *
 * Главная проверка — что номер его собственный. Telegram позволяет
 * переслать боту контакт из записной книжки, и без этой проверки мастер
 * «подтвердил» бы номер брата или конкурента. У своего контакта user_id
 * совпадает с автором сообщения, у чужого — нет или его вовсе нет.
 */
async function handleContact(
  chat: string,
  contact: { phone_number?: string; user_id?: number },
  fromId?: number,
) {
  if (!contact.user_id || !fromId || contact.user_id !== fromId) {
    await replyAndHideKeyboard(
      chat,
      'Это чужой контакт. Подтвердить можно только свой номер — нажмите кнопку «Поделиться номером», а не выбирайте контакт из списка.',
    )
    return
  }

  try {
    const supabase = await createClient()
    const { data } = await supabase.rpc('verify_phone_by_telegram', {
      p_chat_id: chat,
      p_phone: contact.phone_number ?? '',
    })

    const result = (data ?? {}) as {
      status?: string
      company?: string
      stored_tail?: string
      shared_tail?: string
    }
    const company = escapeHtml(String(result.company ?? ''))

    if (result.status === 'ok') {
      await replyAndHideKeyboard(
        chat,
        `<b>Номер подтверждён.</b> В каталоге у мастерской «${company}» появилась отметка «номер проверен».`,
        OPEN_APP,
      )
      return
    }

    if (result.status === 'mismatch') {
      await replyAndHideKeyboard(
        chat,
        [
          '<b>Номера не совпали.</b>',
          '',
          `В мастерской «${company}» указан номер, оканчивающийся на ${escapeHtml(String(result.stored_tail ?? '••••'))},`,
          `а ваш Telegram — на ${escapeHtml(String(result.shared_tail ?? '••••'))}.`,
          '',
          'Подтвердить можно только свой номер. Исправьте номер в профиле мастерской и попробуйте ещё раз.',
        ].join('\n'),
      )
      return
    }

    if (result.status === 'no_phone') {
      await replyAndHideKeyboard(
        chat,
        'Сначала укажите номер в профиле мастерской — потом его можно будет подтвердить.',
      )
      return
    }

    if (result.status === 'not_linked') {
      await replyAndHideKeyboard(
        chat,
        'Этот чат ещё не привязан к мастерской. Откройте кабинет мастера и нажмите «Подключить Telegram».',
      )
      return
    }

    await replyAndHideKeyboard(chat, 'Не получилось прочитать номер. Попробуйте ещё раз.')
  } catch {
    // Telegram повторит доставку сам.
  }
}
