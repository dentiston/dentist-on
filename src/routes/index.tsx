import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search, Truck, BadgePercent, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { smartSearch } from "@/lib/search.functions";
import { useOnline } from "@/lib/use-online";
import hero from "@/assets/hero.jpg";
import { categories, imgSrc, unitPrice, useProducts, type Product } from "@/lib/products";
import { defaultHome, useShopConfig } from "@/lib/config";
import { useDiscounts } from "@/lib/promos";
import { FirstOpenSuggest, PreviousItems } from "@/components/PreviousItems";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { Price } from "@/components/Price";
import { WatchAvailable } from "@/components/WatchAvailable";
import { useBestSellers } from "@/lib/extras";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dentist On — متجر المواد والأدوات السنية" },
      { name: "description", content: "تسوّق المواد والأدوات السنية لعيادتك بأسعار الجملة وتوصيل سريع." },
      { property: "og:title", content: "Dentist On — متجر المواد والأدوات السنية" },
      { property: "og:description", content: "مواد ترميمية، أدوات يدوية، قبضات وأجهزة بأسعار جملة للعيادات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// شرائح التصنيف: خلفية الشريحة المختارة تنزلق بين الشرائح
function CategoryPills({ cats, cat, setCat }: { cats: string[]; cat: string; setCat: (c: string) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  const key = cats.join("|");
  useEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (!el) return;
    setBar({ x: el.offsetLeft, w: el.offsetWidth });
    el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [cat, key]);
  return (
    <div className="mt-4 overflow-x-auto pb-2">
      <div ref={wrap} className="relative flex w-max gap-2">
        {bar && <span aria-hidden className="pill-bar" style={{ width: bar.w, transform: `translateX(${bar.x}px)` }} />}
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            className={`relative z-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300 ${cat === c ? (bar ? "text-primary-foreground" : "bg-primary text-primary-foreground") : "bg-muted"}`}>{c}</button>
        ))}
      </div>
    </div>
  );
}

function Index() {
  const [cat, setCat] = useState("الكل");
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState<"default" | "best" | "new" | "low" | "high">("default");
  const [maxPrice, setMaxPrice] = useState("");
  const [smart, setSmart] = useState<{ q: string; ids: string[] } | null>(null);
  const [smartBusy, setSmartBusy] = useState(false);
  const [focus, setFocus] = useState(false);
  const online = useOnline();
  const best = useBestSellers().data ?? {};
  const { data: products = [], isLoading } = useProducts();
  const { data: cfg } = useShopConfig();
  const home = cfg?.home ?? defaultHome;
  const pctFor = useDiscounts();
  const featured = home.featured.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
  const titleParts = home.hero.title.split("*");
  const present = new Set(products.map((p) => p.category));
  const cats = ["الكل", ...categories.slice(1).filter((c) => present.has(c)), ...[...present].filter((c) => !categories.includes(c))];
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();
  const norm = q.trim().toLowerCase();
  const max = Number(maxPrice) || 0;
  const list = products
    .filter((p) =>
      (cat === "الكل" || p.category === cat) && (!brand || p.brand === brand) && (!max || Number(p.price) <= max) &&
      (!norm || [p.name, p.brand, p.description].some((t) => (t ?? "").toLowerCase().includes(norm))))
    .sort((a, b) =>
      sort === "best" ? (best[b.id] ?? 0) - (best[a.id] ?? 0)
      : sort === "new" ? String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
      : sort === "low" ? Number(a.price) - Number(b.price)
      : sort === "high" ? Number(b.price) - Number(a.price) : 0);
  const suggestions = norm.length >= 2 ? products.filter((p) => [p.name, p.brand].some((t) => (t ?? "").toLowerCase().includes(norm))).slice(0, 5) : [];
  const runSmart = async () => {
    const text = q.trim();
    if (text.length < 3 || smartBusy) return;
    if (!online) { toast.error("البحث الذكي يحتاج اتصالاً بالإنترنت"); return; }
    setSmartBusy(true);
    try {
      const r = await smartSearch({ data: { q: text } });
      if (r.ok) setSmart({ q: text, ids: r.ids });
      else toast.error(r.reason === "busy" ? "البحث الذكي مشغول الآن، جرّب بعد قليل" : "البحث الذكي غير متاح حالياً، استخدم البحث العادي");
    } catch { toast.error("تعذّر البحث الذكي، استخدم البحث العادي"); }
    setSmartBusy(false);
  };
  const smartList = smart ? smart.ids.map((id) => products.find((p) => p.id === id && p.active)).filter((p): p is Product => !!p) : null;
  return (
    <main>
      {home.announcement.enabled && home.announcement.text.trim() && (
        <div className="bg-accent px-4 py-2 text-center text-sm font-bold text-accent-foreground">{home.announcement.text}</div>
      )}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2">
        <div>
          <span className="inline-block rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">For Dental Material</span>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            {titleParts.map((s, i) => (i % 2 ? <span key={i} className="text-accent">{s}</span> : s))}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{home.hero.subtitle}</p>
          <a href="#shop" className="mt-6 inline-block rounded-full bg-primary px-7 py-3 font-bold text-primary-foreground">{home.hero.button}</a>
        </div>
        <img src={home.hero.image || hero} alt="مواد وأدوات سنية" width={1600} height={912} className="w-full rounded-3xl object-cover" />
      </section>

      <section className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-3">
        {[
          { i: BadgePercent, t: "أسعار جملة تلقائية", d: "خصم عند طلب 10 قطع فأكثر" },
          { i: Truck, t: "توصيل سريع", d: "إلى باب عيادتك" },
          { i: ShieldCheck, t: "منتجات أصلية", d: "من موردين معتمدين" },
        ].map(({ i: I, t, d }) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl bg-secondary p-4">
            <I className="h-8 w-8 text-primary" />
            <div><div className="font-bold">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div>
          </div>
        ))}
      </section>

      <FirstOpenSuggest enabled={home.previous} />
      {home.previous && <PreviousItems />}
      <WatchAvailable />
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-10">
          <h2 className="text-2xl font-black">منتجات مميزة</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p, k) => <ProductCard key={p.id} p={p} pct={pctFor(p)} i={k} />)}
          </div>
        </section>
      )}

      <section id="shop" className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-black">المنتجات</h2>
          <form className="flex gap-2 md:w-[26rem]" onSubmit={(e) => { e.preventDefault(); void runSmart(); }}>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => { setQ(e.target.value); if (smart) setSmart(null); }} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onKeyDown={(e) => { if (e.key === "Escape") setFocus(false); }} autoComplete="off" placeholder="ابحث، أو صِف ما تحتاجه (مثال: مادة لحشو ضرس بلون السن)" className="w-full rounded-full border border-input bg-card py-2 pr-9 pl-4 outline-none focus:border-accent" />
              {focus && suggestions.length > 0 && (
                <ul onMouseDown={(e) => e.preventDefault()} className="suggest-pop absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <Link to="/product/$id" params={{ id: p.id }} className="flex items-center gap-3 px-3 py-2 transition hover:bg-muted">
                        <img src={imgSrc(p.image)} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg bg-muted object-cover" />
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{p.name}</span><span className="block text-xs text-muted-foreground">{p.brand}</span></span>
                        <Price usd={unitPrice(p, 1)} usdToo={false} className="shrink-0 text-sm font-black" />
                      </Link>
                    </li>
                  ))}
                  <li className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">{list.length} نتيجة في القائمة أدناه</li>
                </ul>
              )}
            </div>
            <button type="submit" disabled={smartBusy || q.trim().length < 3} className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-4 text-sm font-bold text-accent-foreground disabled:opacity-50">
              <Sparkles className="h-4 w-4" /> {smartBusy ? "…" : "بحث ذكي"}
            </button>
          </form>
        </div>
        <CategoryPills cats={cats} cat={cat} setCat={setCat} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="الماركة" className="rounded-xl border border-input bg-card px-3 py-2 text-sm">
            <option value="">كل الماركات</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="الترتيب" className="rounded-xl border border-input bg-card px-3 py-2 text-sm">
            <option value="default">الترتيب الافتراضي</option>
            <option value="best">الأكثر طلباً</option>
            <option value="new">الأحدث</option>
            <option value="low">السعر: الأقل أولاً</option>
            <option value="high">السعر: الأعلى أولاً</option>
          </select>
          <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="أقصى سعر $" aria-label="أقصى سعر" className="col-span-2 rounded-xl border border-input bg-card px-3 py-2 text-sm sm:col-span-1" dir="ltr" />
        </div>
        {isLoading && <ProductGridSkeleton />}
        {smartList && (
          <div className="mt-6 rounded-2xl border border-accent bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-black"><Sparkles className="ml-1 inline h-4 w-4 text-accent" />نتائج البحث الذكي عن «{smart!.q}» ({smartList.length})</div>
              <button onClick={() => setSmart(null)} aria-label="إغلاق النتائج الذكية" className="grid h-8 w-8 place-items-center rounded-full bg-muted"><X className="h-4 w-4" /></button>
            </div>
            {smartList.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">لم نجد في كتالوج المتجر ما يطابق وصفك. جرّب وصفاً آخر، أو اطلب المادة من «اسأل عن مادة».</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">{smartList.map((p) => <ProductCard key={p.id} p={p} pct={pctFor(p)} />)}</div>
            )}
          </div>
        )}
        <div key={`${cat}|${brand}|${sort}|${max}`} className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {list.map((p, k) => <ProductCard key={p.id} p={p} pct={pctFor(p)} i={k} />)}
        </div>
        {!isLoading && list.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد نتائج</p>}
      </section>
    </main>
  );
}
