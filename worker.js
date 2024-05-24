/* eslint-disable no-restricted-globals */

/**
 * The worker is here to allow installation, its not
 * here to for much more as doing anything complex makes
 * reloading the worker hard.
 * 
 * Not using preload as this causes failures when on an isolated network.
 */

const CACHE_NAME = 'lifepo4';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    cache.addAll([
      '/',
    ]);
  })());
});


self.addEventListener('beforeinstallprompt', (event) => {
  console.log('Before Event Install ', event);
});

const cacheEnabled = false;

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith((async () => {
      if (cacheEnabled 
        && !event.request.headers.get('Authorization')
          && (event.request.destination === 'image'
          || event.request.destination === 'script'
          || event.request.destination === 'style'
          || event.request.destination === 'document'
          || event.request.destination === 'manifest')) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
        if (cachedResponse) {
          const date = cachedResponse.headers.get('date');
          if (date
            && (Date.now() - Date.parse(date)) < 60000) {
            console.debug('HIT', cachedResponse);
            return cachedResponse;
          }
          console.debug('Expired', cachedResponse, (Date.now() - Date.parse(date)));
        }
        try {
          // If the resource was not in the cache or too old in the cache try the network.
          const fetchResponse = await fetch(event.request);

          if (fetchResponse.status === 200) {
            const cacheControl = fetchResponse.headers.get('cache-control');
            if (!(cacheControl.includes('private') || cacheControl.includes('no-store'))) {
              // Save the resource in the cache and return it.
              console.debug('MISS', fetchResponse);
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            }
          }
          console.debug('PASS', fetchResponse);
        } catch (e) {
          console.debug('Network Failed ', e);
          // The network failed.
        }
        if (cachedResponse) {
          // serve stale if its available
          console.debug('STALE', cachedResponse);
          return cachedResponse;
        }
      }
      try {
        console.log("Request ", event.request);
        const passResponse = await fetch(event.request);
        console.debug('PASS request', event.request);
        for (const k of event.request.headers.keys()) {
          console.debug(`   ${k}: ${event.request.headers.get(k)}`);
        }
        console.debug('PASS response', passResponse);
        for (const k of passResponse.headers.keys()) {
          console.debug(`   ${k}: ${passResponse.headers.get(k)}`);
        }
        return passResponse;
      } catch (e) {
        console.debug('Network Failed ', e);
      }
      return new Response('', { status: 504, statusText: 'offline' });
    })());
  }
});
