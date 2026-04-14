const CACHE_NAME = 'ironfaith-v91';

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
