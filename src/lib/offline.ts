// التسوق دون اتصال: لقطة البيانات (localStorage) + مفاتيح الكاش + أدوات مساعدة نقية.
// أسماء الكاش يجب أن تطابق public/sw.js.
export const ASSET_CACHE = "dentist-on-v1";
export const OFFLINE_CACHE = "dentist-on-offline-v1";

const META_KEY = "dentist-on-offline-meta";
const DATA_PREFIX = "dentist-on-offline:";

// سياق دالة الجلب كما يمرّره react-query (نحتاج meta فقط)
export type QCtx = { meta?: Record<string, unknown> | undefined };

export type OfflineMeta = { at: number; products: number; pages: number; files: number; images: number; failed: number };

const store = (): Storage | null => {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
};

export const readMeta = (): OfflineMeta | null => {
  try {
    const raw = store()?.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as OfflineMeta) : null;
  } catch { return null; }
};
export const writeMeta = (m: OfflineMeta) => {
  try { store()?.setItem(META_KEY, JSON.stringify(m)); } catch { /* ممتلئ */ }
};

const saveData = (key: string, value: unknown) => {
  try { store()?.setItem(DATA_PREFIX + key, JSON.stringify(value)); } catch { /* ممتلئ */ }
};
const loadData = <T>(key: string): T | undefined => {
  try {
    const raw = store()?.getItem(DATA_PREFIX + key);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  } catch { return undefined; }
};

// يلفّ دالة جلب react-query: عند الفشل (لا اتصال) تُعاد آخر لقطة محفوظة.
// meta.strict = true (أثناء التنزيل): لا رجوع للّقطة، وتُحفظ النتيجة دائماً.
export async function cached<T>(key: string, fn: () => Promise<T>, meta?: Record<string, unknown>): Promise<T> {
  const strict = meta?.["strict"] === true;
  try {
    const v = await fn();
    if (strict || readMeta()) saveData(key, v); // نحدّث اللقطة تلقائياً فقط لمن نزّل المتجر
    return v;
  } catch (e) {
    if (!strict) {
      const snap = loadData<T>(key);
      if (snap !== undefined) return snap;
    }
    throw e;
  }
}

export async function clearOffline() {
  try { await caches.delete(OFFLINE_CACHE); } catch { /* غير مدعوم */ }
  const s = store();
  if (!s) return;
  for (const k of Object.keys(s)) if (k === META_KEY || k.startsWith(DATA_PREFIX)) s.removeItem(k);
}

export const isPreviewEnv = () => {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return window.self !== window.top || h.includes("lovableproject.com") || h.startsWith("id-preview");
};

// ملفات البناء المُجزَّأة المذكورة في HTML/JS/CSS (assets/x.js أو ./x.js داخل مجلد assets)
const ASSET_RE = /(?:\/?assets\/|\.\/)([\w$.~-]+\.(?:js|mjs|css|png|jpe?g|webp|avif|gif|svg|woff2?|ttf|ico))/g;
export function extractAssetUrls(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(ASSET_RE)) out.add(`/assets/${m[1]}`);
  return [...out];
}

export function extractFontCssUrls(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/https:\/\/fonts\.googleapis\.com\/[^"'\s<>]+/g)) out.add((m[0] ?? "").replace(/&amp;/g, "&"));
  return [...out];
}
export function extractFontFileUrls(css: string): string[] {
  const out = new Set<string>();
  for (const m of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)'"]+)\)/g)) if (m[1]) out.add(m[1]);
  return [...out];
}
