// Service worker: يجعل الموقع قابلاً للتثبيت ويدعم «التسوق دون اتصال».
// - CACHE: ملفات البناء (assets) تُخزَّن عند أول استخدام ومن زر التنزيل.
// - OFFLINE_CACHE: صفحات HTML وصور المنتجات والخطوط التي نزّلها الزبون من الزر العائم.
// لا يخزّن أي بيانات API (طلبات Supabase من نطاق آخر وتُترك للشبكة).
// اسما الكاش ثابتان عمداً (لا ترفع الرقم) وإلا ضاعت نسخة الزبون المحمّلة؛ ويطابقان src/lib/offline.ts.
const CACHE = "dentist-on-v1";
const OFFLINE_CACHE = "dentist-on-offline-v1";
const KEEP = [CACHE, OFFLINE_CACHE];
const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const SLOW_MS = 4000;
const OFFLINE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dentist On</title><body dir="rtl" style="font-family:sans-serif;text-align:center;padding:3rem"><h2>لا يوجد اتصال بالإنترنت</h2><p>تحقق من الاتصال ثم أعد المحاولة، أو <a href="/">افتح المتجر</a> إن كنت قد نزّلته للتسوق دون اتصال.</p></body>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// من النسخة المحمّلة إن وُجدت، وإلا من الشبكة
async function fromOffline(req) {
  const c = await caches.open(OFFLINE_CACHE);
  const hit = await c.match(req.url);
  return hit || fetch(req);
}

// صفحات التنقّل: الشبكة أولاً. إن نُزّلت الصفحة فعندنا نسخة احتياطية عند الانقطاع أو بطء الشبكة أو خطأ الخادم.
async function navigate(e) {
  const req = e.request;
  const cache = await caches.open(OFFLINE_CACHE);
  const saved = await cache.match(req.url, { ignoreSearch: true });
  try {
    const net = fetch(req);
    net.catch(() => {});
    const res = saved
      ? await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), SLOW_MS))])
      : await net;
    if (saved && res.status >= 500) return saved;
    if (saved && res.ok && res.type === "basic") {
      const u = new URL(req.url);
      u.search = ""; u.hash = "";
      e.waitUntil(cache.put(u.href, res.clone()).catch(() => {}));
    }
    return res;
  } catch {
    return saved || new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    // خطوط Google وصور المنتجات المحمّلة فقط. طلبات API (Supabase) لا تُمَسّ أبداً.
    if (FONT_HOSTS.has(url.hostname) || req.destination === "image") e.respondWith(fromOffline(req));
    return;
  }

  if (req.mode === "navigate") { e.respondWith(navigate(e)); return; }

  // ملفات البناء ذات الأسماء المُجزَّأة: من الكاش أولاً مع تحديث بالخلفية
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  // أيقونات وشعارات من مجلد public
  if (req.destination === "image" || req.destination === "manifest") e.respondWith(fromOffline(req));
});
