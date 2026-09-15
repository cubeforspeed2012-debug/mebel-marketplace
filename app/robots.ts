import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

/**
 * Что можно показывать в поиске. Кабинет, админку и вход закрываем:
 * это личные страницы, им в Google делать нечего.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/admin/', '/auth/', '/account/', '/profile/', '/welcome'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
