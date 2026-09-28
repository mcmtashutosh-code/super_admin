/* CBT Super Admin — service worker
   - Caches only the app shell (page + icons) so the app opens offline with a message.
   - NEVER caches API calls or any data; Supabase requests always go to the network. */
const CACHE = 'sa-shell-v1';
const SHELL = ['./superadmin.html', './sa-icon-192.png', './sa-icon-512.png', './sa-favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sa-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Supabase etc: untouched

  if (req.mode === 'navigate') {
    // Network first, so updates are picked up immediately; offline → cached shell
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./superadmin.html', copy)); return res; })
        .catch(() => caches.match('./superadmin.html'))
    );
    return;
  }
  if (SHELL.some((p) => url.pathname.endsWith(p.replace('./', '/')))) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
