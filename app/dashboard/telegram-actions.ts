'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type TelegramState = { link?: string; error?: string; message?: string }

/**
 * Выдаёт одноразовую ссылку на бота. Код живёт 15 минут — за это время
 * его не подобрать, а подобранный чужой код дал бы доступ к заявкам
 * мастера вместе с телефонами его клиентов.
 */
export async function connectTelegram(): Promise<TelegramState> {
  const bot = process.env.TELEGRAM_BOT_USERNAME
  if (!bot) return { error: 'Бот пока не настроен' }

  const supabase = await createClient()
  const { data: code, error } = await supabase.rpc('ensure_telegram_code')

  if (error || !code) return { error: 'Не удалось создать ссылку. Попробуйте ещё раз' }

  return { link: `https://t.me/${bot.replace(/^@/, '')}?start=${code}` }
}

/** Отвязать чат: заявки перестанут приходить в Telegram, но останутся в кабинете. */
export async function disconnectTelegram(): Promise<TelegramState> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('unlink_telegram')

  if (error) return { error: 'Не удалось отключить' }

  revalidatePath('/dashboard')
  return { message: 'Telegram отключён' }
}

/**
 * Ссылка на бота для подтверждения номера.
 *
 * Отдельного кода здесь нет: чат уже привязан к мастерской, по нему бот
 * и узнаёт, чей номер пришёл. А сам номер подделать нельзя — его присылает
 * Telegram, а не человек.
 */
export async function phoneVerifyLink(): Promise<TelegramState> {
  const bot = process.env.TELEGRAM_BOT_USERNAME
  if (!bot) return { error: 'Бот пока не настроен' }

  return { link: `https://t.me/${bot.replace(/^@/, '')}?start=phone` }
}

/**
 * Ссылка на бота — оттуда открывается мини-приложение.
 *
 * Вход мастер проходит один раз: окно Telegram держит куки, и дальше
 * приложение открывается сразу на его цифрах, без пароля.
 */
export async function openBotLink(): Promise<TelegramState> {
  const bot = process.env.TELEGRAM_BOT_USERNAME
  if (!bot) return { error: 'Бот пока не настроен' }

  return { link: `https://t.me/${bot.replace(/^@/, '')}` }
}
