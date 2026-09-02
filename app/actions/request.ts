'use server'

import { createClient } from '@/lib/supabase/server'
import { escapeHtml, notifyTelegram } from '@/lib/telegram'

export type RequestState = { error?: string; message?: string }

/**
 * Заявка покупателя мастеру.
 * Пишет не в таблицы напрямую, а через функцию базы submit_request —
 * она проверяет данные, гасит спам и заводит клиента с заказом в CRM мастера.
 */
export async function sendRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const companyId = Number(formData.get('company_id'))
  const productId = formData.get('product_id') ? Number(formData.get('product_id')) : null
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()

  // Ловушка для ботов: живой человек это поле не видит и не заполняет.
  if (String(formData.get('website') ?? '')) return { message: 'Заявка отправлена' }

  if (!companyId) return { error: 'Мастер не найден' }
  if (name.length < 2) return { error: 'Как вас зовут?' }
  if (phone.replace(/\D/g, '').length < 9) return { error: 'Укажите телефон полностью' }

  const supabase = await createClient()

  const { error } = await supabase.rpc('submit_request', {
    p_company_id: companyId,
    p_name: name,
    p_phone: phone,
    p_message: message || null,
    p_product_id: productId,
  })

  if (error) {
    // Понятные сообщения из базы показываем как есть, остальное — общим текстом.
    const known = /Укажите|не найден|уже отправлена|длинное/.test(error.message)
    return { error: known ? error.message : 'Не удалось отправить заявку. Попробуйте позвонить' }
  }

  // Уведомление мастеру — заявка не должна пролежать незамеченной.
  const { data: company } = await supabase
    .from('companies')
    .select('name, telegram_chat_id')
    .eq('id', companyId)
    .maybeSingle()

  if (company?.telegram_chat_id) {
    await notifyTelegram(
      company.telegram_chat_id,
      [
        '<b>Новая заявка с Mebel</b>',
        '',
        `Имя: ${escapeHtml(name)}`,
        `Телефон: ${escapeHtml(phone)}`,
        message ? `Сообщение: ${escapeHtml(message)}` : null,
        '',
        'Заявка сохранена в кабинете мастера.',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  return { message: 'Заявка отправлена — мастер свяжется с вами' }
}
