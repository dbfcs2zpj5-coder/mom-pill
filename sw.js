const CACHE_NAME = 'mom-pills-cache-v5';

// 這些是 App 需要下載的「核心離線必需品」
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js'
];

// 1. 安裝階段：防彈級別的下載機制
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('正在下載終極離線包 (防彈版)...');
      // 逐一獨立下載，即使缺了一個檔案，也不會罷工！
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => {
            console.log('這個檔案暫時找不到，但不影響核心運作:', url);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// 2. 啟動階段：清走舊版本
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 攔截階段：斷網時提供資料
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果保險箱有，直接秒速提供
        if (response) {
          return response;
        }
        // 沒有就嘗試連網抓，抓到順便存入保險箱
        return fetch(event.request).then(
          function(networkResponse) {
            if(!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
              return networkResponse;
            }
            var responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          }
        ).catch(function() {
            console.log('離線模式運作中，無法抓取最新資源:', event.request.url);
        });
      })
  );
});