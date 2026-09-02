'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type FormState = { error?: string; message?: string }

/** Находит мастерскую текущего пользователя — товар можно вести только своей. */
async function getOwnCompany() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, company: null }

  const { data: company } = await supabase
    .from('companies')
    .select('id, slug')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  return { supabase, company }
}

function parsePrice(raw: FormDataEntryValue | null): number | null {
  const digits = String(raw ?? '').replace(/\s/g, '').replace(',', '.')
  if (!digits) return null
  const value = Number(digits)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, company } = await getOwnCompany()
  if (!company) return { error: 'Сначала создайте профиль мастерской' }

  const id = formData.get('id') ? Number(formData.get('id')) : null
  const title = String(formData.get('title') ?? '').trim()
  if (title.length < 2) return { error: 'Укажите название' }

  const categoryId = formData.get('category_id') ? Number(formData.get('category_id')) : null

  const fields = {
    company_id: company.id,
    category_id: categoryId,
    title,
    description: String(formData.get('description') ?? '').trim() || null,
    type: String(formData.get('type') ?? 'ready_made'),
    price: parsePrice(formData.get('price')),
    price_from: formData.get('price_from') === 'on',
    status: String(formData.get('status') ?? 'active'),
    updated_at: new Date().toISOString(),
  }

  // Фото пришли из браузера уже загруженными — здесь только их ссылки.
  let images: string[] = []
  try {
    const raw = String(formData.get('images') ?? '[]')
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) images = parsed.filter((u): u is string => typeof u === 'string')
  } catch {
    images = []
  }

  let productId = id

  if (id) {
    const { error } = await supabase
      .from('products')
      .update(fields)
      .eq('id', id)
      .eq('company_id', company.id)
    if (error) return { error: error.message }
  } else {
    const { data, error } = await supabase.from('products').insert(fields).select('id').single()
    if (error) return { error: error.message }
    productId = data.id
  }

  // Список фото переписываем целиком — так проще и порядок сохраняется.
  if (productId) {
    await supabase.from('product_images').delete().eq('product_id', productId)
    if (images.length) {
      await supabase.from('product_images').insert(
        images.slice(0, 12).map((url, index) => ({
          product_id: productId,
          url,
          sort_order: index,
        })),
      )
    }
  }

  revalidatePath('/dashboard/products')
  revalidatePath('/catalog')
  revalidatePath(`/company/${company.slug ?? company.id}`)
  redirect('/dashboard/products?saved=1')
}

export async function deleteProduct(formData: FormData) {
  const { supabase, company } = await getOwnCompany()
  if (!company) return

  const id = Number(formData.get('id'))
  if (!id) return

  await supabase.from('products').delete().eq('id', id).eq('company_id', company.id)

  revalidatePath('/dashboard/products')
  revalidatePath('/catalog')
}

/** Быстрое переключение: показывать товар в каталоге или спрятать. */
export async function toggleProductStatus(formData: FormData) {
  const { supabase, company } = await getOwnCompany()
  if (!company) return

  const id = Number(formData.get('id'))
  const next = String(formData.get('next_status') ?? 'active')
  if (!id) return

  await supabase
    .from('products')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company.id)

  revalidatePath('/dashboard/products')
  revalidatePath('/catalog')
}
