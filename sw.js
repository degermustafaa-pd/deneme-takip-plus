/* Deneme Takip — Service Worker
 * Strateji:
 *  - index.html: önce ağ (network-first) → güncellemeler anında yayılır,
 *    internet yoksa önbellekten açılır (çevrimdışı çalışma).
 *  - İkonlar/manifest: önce önbellek (cache-first) → hız.
 * Not: IndexedDB'deki öğrenci verisine bu dosya DOKUNMAZ; sadece uygulama
 * kodunu önbellekler.
 */

const CACHE_ADI = "deneme-takip-plus-v1";

const ON_BELLEKLENECEKLER = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

// Kurulum: uygulama kabuğunu önbelleğe al
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_ADI).then((cache) => cache.addAll(ON_BELLEKLENECEKLER))
  );
  self.skipWaiting();
});

// Aktivasyon: eski sürüm önbelleklerini temizle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((adlar) =>
      Promise.all(
        adlar
          .filter((ad) => ad.startsWith("deneme-takip-") && ad !== CACHE_ADI)
          .map((ad) => caches.delete(ad))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const istek = event.request;
  if (istek.method !== "GET") return;

  const url = new URL(istek.url);
  if (url.origin !== self.location.origin) return; // sadece kendi dosyalarımız

  const gezinmeMi =
    istek.mode === "navigate" || url.pathname.endsWith("index.html");

  if (gezinmeMi) {
    // Ağ öncelikli: yeni sürüm varsa hemen gelsin, yoksa önbellekten aç
    event.respondWith(
      fetch(istek)
        .then((cevap) => {
          const kopya = cevap.clone();
          caches.open(CACHE_ADI).then((cache) => cache.put("./index.html", kopya));
          return cevap;
        })
        .catch(() =>
          caches.match("./index.html").then((c) => c || caches.match("./"))
        )
    );
    return;
  }

  // Diğer dosyalar (ikonlar, manifest): önbellek öncelikli
  event.respondWith(
    caches.match(istek).then(
      (onbellek) =>
        onbellek ||
        fetch(istek).then((cevap) => {
          const kopya = cevap.clone();
          caches.open(CACHE_ADI).then((cache) => cache.put(istek, kopya));
          return cevap;
        })
    )
  );
});
