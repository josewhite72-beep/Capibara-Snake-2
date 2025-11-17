// service-worker.js - VERSIÓN OFFLINE COMPLETA
const CACHE = "pwabuilder-page"; // ⭐ LÍNEA NUEVA PARA PWABUILDER ⭐

const CACHE_NAME = 'capibara-snake-offline-v2.2.0';
const OFFLINE_URL = './offline.html';

// LISTA COMPLETA de todos los archivos necesarios
const urlsToCache = [
  // HTML Principal
  './',
  './index.html',
  
  // Imágenes - Sprites
  './capibara_sprite.png',
  './bully0.png',
  './bully1.png',
  './bully2.png',
  './bully3.png',
  './bully4.png',
  './bully5.png',
  './brigada_capibara_logo.png',
  
  // Sonidos - Música de fondo y efectos
  './background_music.mp3',
  './pop.mp3',
  './boing.mp3',
  './step.mp3',
  './triumph.mp3',
  
  // Audios de Capi-Sensei (TODOS los niveles)
  './level_complete_01.mp3',
  './level_complete_02.mp3',
  './level_complete_03.mp3',
  './level_complete_04.mp3',
  './level_complete_05.mp3',
  './level_complete_06.mp3',
  './level_complete_07.mp3',
  './level_complete_08.mp3',
  './level_complete_09.mp3',
  './level_complete_10.mp3',
  './level_complete_11.mp3',
  './level_complete_12.mp3',
  './level_complete_13.mp3',
  './level_complete_14.mp3',
  './level_complete_15.mp3',
  './level_complete_16.mp3',
  './level_complete_17.mp3',
  './level_complete_18.mp3',
  './level_complete_19.mp3',
  './level_complete_20.mp3',
  './level_complete_21.mp3',
  
  // Manifest e íconos
  './manifest.json'
];

// INSTALACIÓN - Cache AGGRESIVO para offline
self.addEventListener('install', event => {
  console.log('🛠️ Instalando Service Worker (modo offline)...');
  
  // Fuerza la activación inmediata, incluso si hay otros SW
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Abriendo cache, agregando', urlsToCache.length, 'archivos...');
        
        // Estrategia: Cachear TODO, incluso si hay errores
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`⚠️ No se pudo cachear ${url}:`, error);
              // Continuar aunque falle algún archivo
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        console.log('✅ Todos los recursos cacheados (offline ready)');
      })
      .catch(error => {
        console.error('❌ Error crítico en instalación:', error);
      })
  );
});

// ACTIVACIÓN - Más agresiva
self.addEventListener('activate', event => {
  console.log('🎯 Service Worker activado (tomando control)...');
  
  event.waitUntil(
    Promise.all([
      // Tomar control inmediato de todos los clients
      self.clients.claim(),
      
      // Limpiar caches viejos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Eliminando cache viejo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// FETCH - Estrategia OFFLINE-FIRST
self.addEventListener('fetch', event => {
  // Excluir chrome extensions y requests no-GET
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 1. PRIMERO intentar del CACHE
        if (response) {
          console.log('📂 Sirviendo desde cache:', event.request.url);
          return response;
        }
        
        // 2. Si no está en cache, intentar NETWORK
        return fetch(event.request)
          .then(networkResponse => {
            // Si la red funciona, cachear para después
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.log('🌐 Sin conexión, request falló:', event.request.url);
            
            // 3. Estrategias para diferentes tipos de archivos
            if (event.request.destination === 'document') {
              // Para páginas HTML, intentar servir index.html
              return caches.match('./index.html');
            }
            
            // Para imágenes, servir placeholder genérico
            if (event.request.destination === 'image') {
              // Podrías servir una imagen placeholder aquí
              console.log('🖼️ Imagen no disponible offline:', event.request.url);
            }
            
            // Para audio, el juego intentará usar fallbacks
            if (event.request.destination === 'audio') {
              console.log('🔊 Audio no disponible offline:', event.request.url);
            }
            
            // En último caso, error genérico
            return new Response('Offline - Recurso no disponible', {
              status: 408,
              statusText: 'Offline'
            });
          });
      })
  );
});

// Manejar mensajes desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});