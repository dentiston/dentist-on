// Service worker بسيط: يجعل الموقع قابلاً للتثبيت، ويعرض صفحة بلا اتصال.
// لا يخزّن أي بيانات API (طلبات Supabase من نطاق آخر وتُترك للشبكة).
const CACHE = "dentist-on-v1";
const OFFLINE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dentist On</title><body dir="rtl" style="font-family:sans-serif;text-align:center;padding:3rem"><h2>لا يوجد اتصال بالإنترنت</h2><p>تحقق من الاتصال ثم أعد المحاولة.</p></body>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
    return;
  }
  // ملفات البناء ذات الأسماء المُجزَّأة: من الكاش أولاً مع تحديث بالخلفية
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      }),
    );
  }
});
