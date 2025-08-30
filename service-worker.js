const CACHE_NAME = 'pill-reminder-cache-v2'; // Povećaj verziju keša kod svake promjene
const urlsToCache = [
    '/',
    'index.html',
    'app.js',
    'style.css',
    'manifest.json',
    // Ovdje navedi sve ikone koje si postavio u manifest datoteci
    'images/icons/icon-72x72.png',
    'images/icons/icon-96x96.png',
    'images/icons/icon-128x128.png',
    'images/icons/icon-144x144.png',
    'images/icons/icon-152x152.png',
    'images/icons/icon-192x192.png',
    'images/icons/icon-384x384.png',
    'images/icons/icon-512x512.png'
];

// Instalacija Service Worker-a: Kešira sve potrebne datoteke
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Keširano sučelje');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Keširanje nije uspjelo:', error);
            })
    );
});

// Aktivacija Service Worker-a: Briše stare keširane podatke
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Brisanje starog keša:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Dohvaćanje resursa: Poslužuje keširane resurse kada je moguće
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Keš je pronađen, vraćamo ga
                if (response) {
                    return response;
                }
                // Nije pronađen, pokušavamo dohvatiti s mreže
                return fetch(event.request).then(
                    function(response) {
                        // Provjeravamo je li odgovor ispravan
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        // Kloniramo odgovor. Body se može koristiti samo jednom
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                ).catch(error => {
                    console.error('Dohvaćanje nije uspjelo:', error);
                    return new Response('Offline Page', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});
