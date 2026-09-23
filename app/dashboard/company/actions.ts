'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { normalizePhone } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export type FormState = { error?: string; message?: string }

/** «Мебель Уста» → «mebel-usta». Из названия делаем адрес страницы. */
function slugify(name: string): string {
  const translit: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
    щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }

  return name
    .toLowerCase()
    .split('')
    .map((char) => translit[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function saveCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Сначала войдите в кабинет' }

  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone_public') ?? '').trim()

  if (name.length < 2) return { error: 'Укажите название мастерской' }
  if (!phone) return { error: 'Укажите телефон — без него клиенты не смогут позвонить' }

  const fields = {
    name,
    // Номер приводим к +998… — иначе кнопка «Позвонить» не наберёт
    phone_public: normalizePhone(phone) ?? phone,
    description: String(formData.get('description') ?? '').trim() || null,
    district: String(formData.get('district') ?? '') || null,
    address: String(formData.get('address') ?? '').trim() || null,
    work_type: String(formData.get('work_type') ?? 'both'),
    instagram: String(formData.get('instagram') ?? '').trim().replace('@', '') || null,
    telegram: String(formData.get('telegram') ?? '').trim().replace('@', '') || null,
    logo_url: String(formData.get('logo_url') ?? '').trim() || null,
    updated_at: new Date().toISOString(),
  }

  /*
   * Логотип может прийти и файлом — прямо в форме. Загрузка из браузера
   * работает не на всех телефонах, а обычное поле файла работает везде.
   */
  const logo = formData.get('logo_file')
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 5 * 1024 * 1024) {
      return { error: 'Логотип больше 5 МБ — уменьшите и попробуйте снова' }
    }

    const ext = logo.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('company-media')
      .upload(path, logo, {
        cacheControl: '3600',
        upsert: false,
        contentType: logo.type || 'image/jpeg',
      })

    if (uploadError) {
      return { error: `Не удалось загрузить логотип: ${uploadError.message}` }
    }

    fields.logo_url = supabase.storage.from('company-media').getPublicUrl(path).data.publicUrl
  }

  const { data: existing } = await supabase
    .from('companies')
    .select('id, slug')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('companies').update(fields).eq('id', existing.id)
    if (error) return { error: error.message }

    revalidatePath('/profile')
    revalidatePath(`/company/${existing.slug ?? existing.id}`)
    return { message: 'Профиль сохранён' }
  }

  // Новая мастерская: подбираем свободный адрес страницы
  const base = slugify(name) || `master-${Date.now()}`
  let slug = base
  for (let attempt = 1; attempt < 20; attempt++) {
    const { data: taken } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!taken) break
    slug = `${base}-${attempt + 1}`
  }

  const { error } = await supabase
    .from('companies')
    .insert({ ...fields, slug, owner_user_id: user.id, status: 'pending' })

  if (error) return { error: error.message }

  // Роль в профиле — продавец: он теперь ведёт мастерскую.
  // Администратора не трогаем: иначе владелец площадки, заведя свою
  // мастерскую, потерял бы доступ к управлению.
  await supabase
    .from('profiles')
    .update({ role: 'seller' })
    .eq('id', user.id)
    .neq('role', 'admin')

  revalidatePath('/dashboard')
  revalidatePath('/profile')

  /*
   * Уводим в кабинет, а не оставляем на форме. Человек только что всё
   * заполнил и видит ту же форму со строчкой «сохранено» — ему кажется,
   * что ничего не произошло. В кабинете он сразу видит свою мастерскую,
   * надпись «на проверке» и что делать дальше: добавить работы.
   */
  redirect('/dashboard')
}
