import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

/**
 * Карта сайта для Google: главная, каталог и каждая страница мастера
 * и товара. Каталог — главный источник бесплатного трафика, поэтому
 * важно, чтобы поисковик знал обо всех страницах, а не только о главной.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const base: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/companies`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    // Ознакомительная страница: на неё ведёт реклама, и по ней человек
    // решает, оставаться или нет. Без неё в карте Google о ней не узнает.
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const supabase = await createClient()

    const [{ data: companies }, { data: products }] = await Promise.all([
      supabase.from('companies').select('id, slug, updated_at').eq('status', 'active'),
      supabase.from('products').select('id, updated_at').eq('status', 'active'),
    ])

    for (const company of companies ?? []) {
      base.push({
        url: `${SITE_URL}/company/${company.slug ?? company.id}`,
        lastModified: company.updated_at ? new Date(company.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    for (const product of products ?? []) {
      base.push({
        url: `${SITE_URL}/product/${product.id}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  } catch {
    // База не ответила — отдаём хотя бы основные страницы, пустая карта хуже.
  }

  return base
}
