/*
 * Минимальный служебный работник. Он нужен браузеру, чтобы считать сайт
 * приложением и предложить установку. Кэш держим маленький и осторожный:
 * страницы всегда берём из сети, чтобы человек не увидел вчерашний каталог,
 * а из кэша отдаём только когда сети нет совсем.
 */

const CACHE = 'mebel-v1'
const OFFLINE_FALLBACK = '/'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_FALLBACK)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Кэшируем только обычные GET-запросы за своими страницами.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (request.mode === 'navigate' && response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        return cached ?? caches.match(OFFLINE_FALLBACK)
      }),
  )
})
