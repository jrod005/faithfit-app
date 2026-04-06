const CACHE_NAME = 'ironfaith-v25';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './food-db.js',
    './routines.js',
    './exercise-info.js',
    './app.js',
    './coach.js',
    './photos.js',
    './food-db.js',
    './social.js',
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

// Fetch - network first, fall back to cache
self.addEventListener('fetch', e => {
    e.respondWith(
        fetch(e.request)
            .then(response => {
                // Cache successful responses for offline use
                if (response.ok && e.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});
