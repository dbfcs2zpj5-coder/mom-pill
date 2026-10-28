const CACHE_NAME = 'mom-pills-cache-v7';

// 核心離線必需品
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+HK:wght@400;500;700;900&display=swap'
];

// 1. 安裝階段：下載核心檔案完成後執行 skipWaiting
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        urlsToCache.map(url =>
          cache.add(url).catch(err => {
            console.log('這個檔案暫時找不到，但不影響核心運作:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. 啟動階段：清走舊版本快取並立即接管頁面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. 攔截階段：對 HTML 導航採用 Network-First（有網即攞最新版並更新快取，斷網即讀本地快取），對靜態資源採用 Cache-First
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const reqUrl = event.request.url;
  if (!reqUrl.startsWith('http://') && !reqUrl.startsWith('https://')) return;

  const isHtmlNavigation =
    event.request.mode === 'navigate' ||
    reqUrl.endsWith('/index.html') ||
    reqUrl.endsWith('/manifest.json');

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          if (
            !networkResponse ||
            (networkResponse.status !== 200 && networkResponse.status !== 0)
          ) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
          return networkResponse;
        })
        .catch(() => {
          return new Response('', {
            status: 503,
            statusText: 'Offline'
          });
        });
    })
  );
});
