// 악보마당 Service Worker v5
const CACHE_NAME = 'akbomadag-v5';

self.addEventListener('install', event => {
  console.log('[SW v5] 설치됨');
  self.skipWaiting();
});

// 활성화 시 모든 이전 캐시 삭제 + 페이지 강제 새로고침
self.addEventListener('activate', event => {
  console.log('[SW v5] 활성화 — 이전 캐시 전체 삭제');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' })
        .then(clients => clients.forEach(c => c.navigate(c.url)))
      )
  );
});

// 모든 요청 네트워크 우선 — 캐시로 인한 로그인 문제 방지
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // HTML, Firebase, Google 인증 — 무조건 네트워크
  if (
    event.request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('firebaseapp') ||
    url.hostname.includes('google.com')
  ) {
    event.respondWith(fetch(event.request).catch(() => new Response('오프라인 상태예요', { status: 503 })));
    return;
  }

  // 정적 리소스 — 네트워크 우선, 실패 시 캐시
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// 푸시 알림
self.addEventListener('push', event => {
  if (!event.data) return;
  const d = event.data.json();
  event.waitUntil(self.registration.showNotification(d.title || '악보마당', {
    body: d.body || '새 악보가 올라왔어요!',
    icon: './icon-192.png', badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: d.url || './score-community.html' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || './score-community.html';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) if (c.url.includes('score-community') && 'focus' in c) return c.focus();
      return clients.openWindow(url);
    })
  );
});
