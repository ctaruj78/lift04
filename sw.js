self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open('liftapp-v1').then((cache) => {
            console.log('Caching files...');
            return cache.addAll([
                './index.html',
                './lifts.html',
                './settings.html',
                './users.html',
                './requests.html',
                './logs.html',
                './map.html',
                './qrcodes.html',
                './reports.html',
                './js/common.js',
                './js/index.js',
                './js/login.js',
                './js/lifts.js',
                './js/users.js',
                './js/requests.js',
                './js/logs.js',
                './js/map.js',
                './js/qrcodes.js',
                './js/settings.js',
                './js/reports.js',
                './js/charts.js',
                './css/adminlte.min.css',
                './icons/icon-192x192.png',
                './icons/icon-512x512.png',
                'https://code.jquery.com/jquery-3.6.0.min.js',
                'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js',
                'https://cdn.datatables.net/1.10.25/js/jquery.dataTables.min.js',
                'https://cdn.datatables.net/1.10.25/js/dataTables.bootstrap4.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
                'https://cdn.datatables.net/1.10.25/css/dataTables.bootstrap4.min.css',
                'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css',
                'https://cdn.jsdelivr.net/npm/chart.js',
                'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js',
                'https://unpkg.com/leaflet@1.9.3/dist/leaflet.css',
                'https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js',
                'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
            ]).catch(err => console.error('Cache failed:', err));
        })
    );
});

self.addEventListener('fetch', (event) => {
    console.log('Fetching:', event.request.url);
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                console.log('Serving from cache:', event.request.url);
                return response;
            }
            return fetch(event.request).then((networkResponse) => {
                if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
                    caches.open('liftapp-v1').then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        console.log('Cached:', event.request.url);
                    });
                }
                return networkResponse;
            }).catch(() => {
                console.log('Network failed, serving fallback');
                return caches.match('./index.html');
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    const cacheWhitelist = ['liftapp-v1'];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});