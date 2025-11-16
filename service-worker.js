const CACHE_NAME = 'capibara-snake-v2.1.0';
const STATIC_CACHE = 'static-v2.1';
const AUDIO_CACHE = 'audio-v2.1';
const ASSETS_CACHE = 'assets-v2.1';

// Archivos críticos - deben estar disponibles inmediatamente
const STATIC_FILES = [
  './',
  './index.html',
  './offline.html',
  './manifest.json'
];

// Archivos de audio - cachear progresivamente
const AUDIO_FILES = [
  './audio/background_music.mp3',
  './audio/pop.mp3',
  './audio/boing.mp3',
  './audio/step.mp3',
  './audio/triumph.mp3'
];

// Generar rutas para los audios de niveles
for (let i = 1; i <= 21; i++) {
  const levelNum = i.toString().padStart(2, '0');
  AUDIO_FILES.push(`./audio/level_complete_${levelNum}.mp3`);
}

// Assets del juego
const ASSET_FILES = [
  './assets/brigada_capibara_logo.png',
  './assets/capibara_sprite.png',
  './assets/bully0.png',
  './assets/bully1.png',
  './assets/bully2.png',
  './assets/bully3.png',
  './assets/bully4.png',
  './assets/bully5.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker instalándose...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📁 Cacheando archivos estáticos críticos...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Archivos estáticos cacheados');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Error en instalación:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activado');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Eliminar caches antiguos
          if (![STATIC_CACHE, AUDIO_CACHE, ASSETS_CACHE].includes(cacheName)) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Solo manejar solicitudes GET
  if (event.request.method !== 'GET') return;
  
  // Estrategias específicas por tipo de recurso
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(audioCacheStrategy(event.request));
  } else if (url.pathname.includes('/assets/')) {
    event.respondWith(assetsCacheStrategy(event.request));
  } else {
    event.respondWith(networkFirstStrategy(event.request));
  }
});

// Estrategia para audio: Cache First con actualización en background
async function audioCacheStrategy(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Siempre devolver cacheado si existe, pero actualizar en background
  if (cachedResponse) {
    updateCacheInBackground(request, cache);
    return cachedResponse;
  }
  
  // Si no está cacheado, intentar red
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('🔇 Audio no disponible:', request.url);
    return new Response('', { status: 404 });
  }
}

// Estrategia para assets: Cache First
async function assetsCacheStrategy(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('🖼️ Asset no disponible:', request.url);
    return new Response('', { status: 404 });
  }
}

// Estrategia general: Network First
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cachear respuestas exitosas
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback a cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback a offline.html para páginas
    if (request.destination === 'document' || 
        request.headers.get('Accept').includes('text/html')) {
      return caches.match('./offline.html');
    }
    
    return new Response('Recurso no disponible offline', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Actualizar cache en background sin bloquear la respuesta
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silencioso - no afecta la experiencia del usuario
  }
}

// Manejar mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});