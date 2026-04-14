const CACHE_NAME = 'ironfaith-v92';

// Allow the page to tell a waiting SW to take over immediately
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
const ASSETS = [
    './',
    './index.html',
    './app.html',
    './styles.css',
    './food-db.js',
    './routines.js',
    './exercise-info.js',
    './app.js',
    './coach.js',
    './photos.js',
    './food-db.js',
    './social.js',
    './cloud-sync.js',
    './privacy.html',
    './terms.html',
    './basic.html',
    './basic-app.js',
    './basic-styles.css',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install - cache core assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Notification click — open / focus the app
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Focus an existing window if open
            for (const client of windowClients) {
                if (client.url.includes('app.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new one
            return clients.openWindow('./app.html');
        })
    );
});

// Periodic background sync (Android Chrome only) — fire scheduled reminders
self.addEventListener('periodicsync', e => {
    if (e.tag === 'streak-check') {
        e.waitUntil(
            (async () => {
                // Check localStorage isn't accessible from SW, so use a simple reminder
                self.registration.showNotification('\u{1F525} Don\'t forget to train today', {
                    body: 'Keep your streak alive — even 15 minutes counts.',
                    icon: './icons/icon-192.png',
                    badge: './icons/icon-192.png',
                    tag: 'streak-reminder',
                });
            })()
        );
    }
});

// Fetch - network first, fall back to cache
// IMPORTANT: never intercept Supabase API/auth/storage/realtime calls.
// Caching them breaks auth state and causes PostgREST queries to hang on iOS.
self.addEventListener('fetch', e => {
    const url = e.request.url;
    if (
        url.includes('supabase.co') ||
        url.includes('supabase.in') ||
        e.request.method !== 'GET'
    ) {
        // Pass through untouched
        return;
    }
    e.respondWith(
        fetch(e.request)
            .then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});
