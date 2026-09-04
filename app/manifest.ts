import type { MetadataRoute } from 'next'

/**
 * Паспорт приложения для телефона: по нему браузер предлагает
 * «Установить» и показывает нашу иконку на домашнем экране.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mebel — мебель Ташкента',
    short_name: 'Mebel',
    description:
      'Каталог мебельных мастеров и фабрик Ташкента: готовая мебель и мебель на заказ.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#131313',
    theme_color: '#0f0f0f',
    lang: 'ru',
    categories: ['shopping', 'business'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Каталог', url: '/catalog' },
      { name: 'Мастера', url: '/companies' },
    ],
  }
}
