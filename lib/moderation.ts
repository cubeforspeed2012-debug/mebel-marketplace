/**
 * Автопроверка работ.
 *
 * Разбирать руками каждую работу владелец площадки быстро перестанет —
 * и тогда очередь станет кладбищем, а проверка фикцией. Поэтому обычную
 * работу пропускает помощник, а к человеку попадает только спорное.
 *
 * Порядок такой: сперва дешёвые механические проверки (они ловят
 * большинство мусора и не тратят запрос к ИИ), потом сам ИИ, и в конце —
 * лестница доверия: первые работы новой мастерской смотрит человек,
 * даже если ИИ их одобрил. Фотографии ИИ не видит, а подменить их проще
 * всего — поэтому доверие мастерская зарабатывает, а не получает сразу.
 */

import { askGroq, extractJson } from '@/lib/groq'

export type Verdict = 'approve' | 'review' | 'reject'
export type Decision = { verdict: Verdict; reason: string }

/** Сколько работ мастерская должна пройти через человека, прежде чем ей поверят */
export const TRUST_AFTER = 2

export type ProductForReview = {
  title: string
  description: string | null
  price: number | null
  type: string | null
  photos: number
}

/* Явный мусор ловим без ИИ: это быстрее, бесплатнее и надёжнее модели. */
const CONTACT = /(\+?998[\s\-()]*\d{2}[\s\-()]*\d{3}|@[a-z0-9_]{4,}|t\.me\/|wa\.me\/|instagram\.com|telegram|ватсап|whatsapp|https?:\/\/|www\.)/i
const BANNED = /(наркот|оруж|казино|ставк|займ|кредит\s*под|интим|эскорт|секс|виагр|диплом\s*куп)/i

/** Механические правила. Возвращают причину отказа или null. */
export function mechanicalCheck(p: ProductForReview): Decision | null {
  const title = (p.title ?? '').trim()
  const text = `${title} ${p.description ?? ''}`.trim()

  if (p.photos === 0) {
    return { verdict: 'reject', reason: 'Нет ни одной фотографии. Добавьте снимки готовой работы.' }
  }
  if (title.length < 3) {
    return { verdict: 'reject', reason: 'Слишком короткое название — по нему не понять, что это.' }
  }
  if (BANNED.test(text)) {
    return { verdict: 'reject', reason: 'В тексте есть слова, которых не должно быть в мебельном объявлении.' }
  }
  if (CONTACT.test(text)) {
    return {
      verdict: 'reject',
      reason:
        'В названии или описании есть контакты или ссылка. Телефон клиенты видят кнопкой «Показать номер» — в тексте его писать не нужно.',
    }
  }
  // Каплок и бесконечные восклицания — верный признак объявления-спама
  const letters = title.replace(/[^А-Яа-яA-Za-zЁё]/g, '')
  if (letters.length > 6 && letters === letters.toUpperCase()) {
    return { verdict: 'reject', reason: 'Название написано заглавными буквами. Напишите обычными.' }
  }
  if (/(.)\1{5,}|!{3,}/.test(text)) {
    return { verdict: 'reject', reason: 'В тексте повторяющиеся символы — так пишут спам.' }
  }
  if (p.price !== null && (p.price < 10000 || p.price > 2_000_000_000)) {
    return { verdict: 'reject', reason: 'Цена выглядит ошибочной. Проверьте, сколько нулей.' }
  }
  return null
}

const SYSTEM = `Ты — модератор каталога мебели Mebel (Ташкент). Решаешь, пускать ли работу мастера в каталог.

Отвечай строго объектом JSON, без пояснений и markdown:
{"verdict": "approve" | "review" | "reject", "reason": "одно предложение по-русски"}

ПРОПУСКАТЬ (approve):
- Это мебель или услуга по изготовлению мебели: кухни, шкафы, шкафы-купе, спальни, кровати, диваны, столы, стулья, прихожие, детская, офисная мебель, фасады, столешницы, гардеробные, тумбы, комоды.
- Название понятное, описание про эту же мебель.
- Пусть текст простой и короткий — это нормально, мастера не копирайтеры. Короткое описание не повод отказывать.

К ЧЕЛОВЕКУ (review) — когда сомневаешься:
- Непонятно, мебель это или нет.
- Название и описание про разное.
- Похоже на перепродажу чужого товара, на объявление магазина, а не мастера.
- Что-то странное, чего нет в правилах выше.

ОТКЛОНЯТЬ (reject):
- Это не мебель (техника, одежда, авто, стройматериалы навалом, услуги не по мебели).
- Оскорбления, непристойность, обман, обещание «заработка».
- Призыв писать в обход площадки, реклама чужого сайта или магазина.
- Текст-бессмыслица, набор букв.

В reason пиши коротко и по-человечески, так, чтобы мастер понял, что исправить. Без обращений и вежливых оборотов.

Не рассуждай вслух. Сразу выдай JSON.`

/** Спрашивает ИИ. Если он не ответил — отправляем работу человеку, не в каталог. */
export async function aiCheck(p: ProductForReview): Promise<Decision> {
  const lines = [
    `Название: ${p.title}`,
    `Тип: ${p.type === 'custom_order' ? 'на заказ' : 'готовая мебель'}`,
    `Цена: ${p.price ? `${p.price} сум` : 'не указана'}`,
    `Фотографий: ${p.photos}`,
    `Описание: ${p.description?.trim() || '(пусто)'}`,
  ]

  const result = await askGroq(SYSTEM, lines.join('\n'), { json: true })
  if (result.error || !result.text) {
    return { verdict: 'review', reason: 'Помощник не ответил — нужна проверка человеком.' }
  }

  try {
    const raw = extractJson(result.text) ?? result.text
    const parsed = JSON.parse(raw) as { verdict?: string; reason?: string }
    const verdict: Verdict =
      parsed.verdict === 'approve' || parsed.verdict === 'reject' ? parsed.verdict : 'review'

    return {
      verdict,
      reason: String(parsed.reason ?? '').trim().slice(0, 300) || 'Без пояснения.',
    }
  } catch {
    return { verdict: 'review', reason: 'Помощник ответил непонятно — нужна проверка человеком.' }
  }
}

/**
 * Итоговое решение по работе.
 *
 * Одобрить сам ИИ может только у мастерской, которая уже провела
 * несколько работ через человека. Новичку одобрение ИИ засчитывается
 * как «замечаний нет», но в каталог его пускает всё равно человек:
 * фотографии ИИ не видит, а именно на них и строится обман.
 */
export async function decide(p: ProductForReview, approvedBefore: number): Promise<Decision> {
  const mechanical = mechanicalCheck(p)
  if (mechanical) return mechanical

  const ai = await aiCheck(p)

  if (ai.verdict === 'approve' && approvedBefore < TRUST_AFTER) {
    return {
      verdict: 'review',
      reason: `Замечаний нет, но это ${approvedBefore + 1}-я работа мастерской — первые смотрит человек.`,
    }
  }

  return ai
}
