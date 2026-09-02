'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ORDER_STATUSES } from '@/lib/orders'

export type FormState = { error?: string; message?: string }

async function getOwnCompany() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, company: null }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  return { supabase, company }
}

/** Перевод заказа на следующий этап воронки. */
export async function updateOrderStatus(formData: FormData) {
  const { supabase, company } = await getOwnCompany()
  if (!company) return

  const id = Number(formData.get('id'))
  const status = String(formData.get('status') ?? '')
  if (!id || !(status in ORDER_STATUSES)) return

  await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company.id)

  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard')
}

/** Заказ, заведённый вручную: клиент позвонил сам или пришёл из Instagram. */
export async function createOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, company } = await getOwnCompany()
  if (!company) return { error: 'Сначала создайте профиль мастерской' }

  const name = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').replace(/\D/g, '')
  const title = String(formData.get('title') ?? '').trim()

  if (name.length < 2) return { error: 'Укажите имя клиента' }
  if (phone.length < 9) return { error: 'Укажите телефон клиента' }

  // Клиент уже мог обращаться — тогда не плодим дубли.
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('company_id', company.id)
    .eq('phone', phone)
    .maybeSingle()

  let clientId = existing?.id

  if (!clientId) {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        company_id: company.id,
        full_name: name,
        phone,
        source: String(formData.get('source') ?? 'phone'),
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    clientId = data.id
  }

  const { error } = await supabase.from('orders').insert({
    client_id: clientId,
    company_id: company.id,
    type: String(formData.get('type') ?? 'custom'),
    status: 'new',
    title: title || 'Заказ',
    comment: String(formData.get('comment') ?? '').trim() || null,
    source: String(formData.get('source') ?? 'phone'),
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/clients')
  return { message: 'Заказ добавлен' }
}

/** Правки в карточке заказа: цена, дата замера, заметка. */
export async function updateOrderDetails(formData: FormData) {
  const { supabase, company } = await getOwnCompany()
  if (!company) return

  const id = Number(formData.get('id'))
  if (!id) return

  const priceRaw = String(formData.get('total_price') ?? '').replace(/\s/g, '')
  const price = priceRaw ? Number(priceRaw) : null
  const measurement = String(formData.get('measurement_visit_date') ?? '')

  await supabase
    .from('orders')
    .update({
      total_price: Number.isFinite(price as number) ? price : null,
      measurement_visit_date: measurement || null,
      comment: String(formData.get('comment') ?? '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('company_id', company.id)

  revalidatePath('/dashboard/orders')
}

export async function deleteOrder(formData: FormData) {
  const { supabase, company } = await getOwnCompany()
  if (!company) return

  const id = Number(formData.get('id'))
  if (!id) return

  await supabase.from('orders').delete().eq('id', id).eq('company_id', company.id)
  revalidatePath('/dashboard/orders')
}
