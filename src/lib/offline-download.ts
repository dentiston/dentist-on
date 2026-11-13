import type { QueryClient } from "@tanstack/react-query";
import { productsQuery, imgSrc } from "@/lib/products";
import { configQuery } from "@/lib/config";
import { promosQuery } from "@/lib/promos";
import { rateQuery } from "@/lib/rate";
import { waQuery } from "@/lib/store";
import { aboutQuery } from "@/lib/about";
import { bestSellersQuery } from "@/lib/extras";
import {
  ASSET_CACHE, OFFLINE_CACHE, extractAssetUrls, extractFontCssUrls, extractFontFileUrls, writeMeta, type OfflineMeta,
} from "@/lib/offline";

// لا نحمّل صفحات HTML لأكثر من هذا العدد من المنتجات (التنقّل داخل المتجر يعمل لكل المنتجات)
const MAX_PRODUCT_PAGES = 120;
const PUBLIC_FILES = ["/favicon.png", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

type Progress = (percent: number, label: string) => void;

async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) await fn(items[i++] as T);
    }),
  );
}

const quota = (e: unknown) => e instanceof DOMException && e.name === "QuotaExceededError";

// ينزّل: بيانات المتجر (لقطة محلية)، صفحاته، ملفات التطبيق، الخطوط، وصور المنتجات.
export async function downloadStore(qc: QueryClient, onProgress: Progress): Promise<OfflineMeta> {
  if (typeof caches === "undefined") throw new Error("المتصفح لا يدعم التخزين دون اتصال");
  const [offline, assets] = await Promise.all([caches.open(OFFLINE_CACHE), caches.open(ASSET_CACHE)]);
  void navigator.storage?.persist?.().catch(() => {}); // طلب عدم حذف النسخة تلقائياً عند ضيق المساحة

  // 1) البيانات: strict يمنع الرجوع للّقطة القديمة ويحفظ النتيجة الجديدة
  onProgress(2, "تنزيل المنتجات والأسعار…");
  const strict = { meta: { strict: true }, staleTime: 0 };
  const products = await qc.fetchQuery({ ...productsQuery, ...strict });
  await Promise.all([
    qc.fetchQuery({ ...configQuery, ...strict }),
    qc.fetchQuery({ ...promosQuery, ...strict }),
    qc.fetchQuery({ ...rateQuery, ...strict }),
    qc.fetchQuery({ ...waQuery, ...strict }),
    qc.fetchQuery({ ...aboutQuery, ...strict }).catch(() => undefined), // قبل تنفيذ SQL الدفعة 5 لا يفشل التنزيل
    qc.fetchQuery({ ...bestSellersQuery, ...strict }),
  ]);

  // 2) الصفحات
  const pages = ["/", "/cart", "/account", "/track", "/offers", "/about", ...products.slice(0, MAX_PRODUCT_PAGES).map((p) => `/product/${encodeURIComponent(p.id)}`)];
  const refs = new Set<string>();
  const fontCss = new Set<string>();
  let pagesOk = 0;
  let done = 0;
  await pool(pages, 3, async (path) => {
    try {
      const res = await fetch(path, { headers: { Accept: "text/html" }, cache: "reload" });
      if (res.ok && (res.headers.get("content-type") ?? "").includes("text/html")) {
        const html = await res.clone().text();
        await offline.put(path, res);
        extractAssetUrls(html).forEach((u) => refs.add(u));
        extractFontCssUrls(html).forEach((u) => fontCss.add(u));
        pagesOk++;
      }
    } catch (e) {
      if (quota(e)) throw new Error("مساحة التخزين على الجهاز لا تكفي");
    }
    onProgress(5 + (++done / pages.length) * 25, "تنزيل صفحات المتجر…");
  });
  if (pagesOk === 0) throw new Error("تعذّر تنزيل صفحات المتجر، تحقق من الاتصال");

  // 3) ملفات التطبيق (JS/CSS/صور مدمجة)؛ نفحص كل ملف بحثاً عن ملفات أخرى يستدعيها
  const seen = new Set<string>();
  let queue = [...refs];
  let files = 0;
  let fetched = 0;
  while (queue.length) {
    const batch = queue.filter((u) => !seen.has(u));
    queue = [];
    batch.forEach((u) => seen.add(u));
    await pool(batch, 6, async (u) => {
      try {
        const res = await fetch(u);
        if (!res.ok) return;
        if (/\.(?:m?js|css)$/.test(u)) extractAssetUrls(await res.clone().text()).forEach((n) => { if (!seen.has(n)) queue.push(n); });
        await assets.put(u, res);
        files++;
      } catch (e) {
        if (quota(e)) throw new Error("مساحة التخزين على الجهاز لا تكفي");
      }
      onProgress(30 + Math.min(1, ++fetched / seen.size) * 20, "تنزيل ملفات التطبيق…");
    });
  }

  // 4) الخطوط (Cairo) وأيقونات التطبيق
  onProgress(52, "تنزيل الخطوط…");
  for (const href of fontCss) {
    try {
      const res = await fetch(href, { mode: "cors" });
      if (!res.ok) continue;
      const css = await res.clone().text();
      await offline.put(href, res);
      await pool(extractFontFileUrls(css), 4, async (f) => {
        try { const r = await fetch(f, { mode: "cors" }); if (r.ok) await offline.put(f, r); } catch { /* نتخطى الخط */ }
      });
    } catch { /* الخطوط اختيارية */ }
  }
  await pool(PUBLIC_FILES, 3, async (f) => {
    try { const r = await fetch(f); if (r.ok) await offline.put(f, r); } catch { /* اختياري */ }
  });

  // 5) صور المنتجات (الرئيسية والإضافية)
  const imgs = new Set<string>();
  for (const p of products) for (const i of [p.image, ...(p.images ?? [])]) if (i) imgs.add(new URL(imgSrc(i), location.href).href);
  const list = [...imgs];
  let imagesOk = 0;
  let failed = 0;
  done = 0;
  await pool(list, 6, async (href) => {
    try {
      const u = new URL(href);
      const same = u.origin === location.origin;
      const res = await fetch(href, same ? undefined : { mode: "cors" }); // CORS كي لا تُحتسب الصورة بحجم مضخّم
      if (!res.ok) throw new Error("bad");
      await (same && u.pathname.startsWith("/assets/") ? assets : offline).put(href, res);
      imagesOk++;
    } catch (e) {
      if (quota(e)) throw new Error("مساحة التخزين على الجهاز لا تكفي");
      failed++;
    }
    onProgress(55 + (++done / list.length) * 44, "تنزيل صور المنتجات…");
  });

  const meta: OfflineMeta = { at: Date.now(), products: products.length, pages: pagesOk, files, images: imagesOk, failed };
  writeMeta(meta);
  onProgress(100, "اكتمل التنزيل");
  return meta;
}
