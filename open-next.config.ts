import { defineCloudflareConfig } from '@opennextjs/cloudflare'

/**
 * Настройка адаптера, который превращает Next.js в приложение
 * для Cloudflare Workers. Кэш страниц лежит в Cloudflare KV.
 */
export default defineCloudflareConfig()
