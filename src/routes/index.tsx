import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Truck, BadgePercent, ShieldCheck } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { categories, useProducts, type Product } from "@/lib/products";
import { defaultHome, useShopConfig } from "@/lib/config";
import { useDiscounts } from "@/lib/promos";
import { FirstOpenSuggest, PreviousItems } from "@/components/PreviousItems";
import { ProductCard } from "@/components/ProductCard";

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

function Index() {
  const [cat, setCat] = useState("الكل");
  const [q, setQ] = useState("");
  const { data: products = [], isLoading } = useProducts();
  const { data: cfg } = useShopConfig();
  const home = cfg?.home ?? defaultHome;
  const pctFor = useDiscounts();
  const featured = home.featured.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
  const titleParts = home.hero.title.split("*");
  const present = new Set(products.map((p) => p.category));
  const cats = ["الكل", ...categories.slice(1).filter((c) => present.has(c)), ...[...present].filter((c) => !categories.includes(c))];
  const list = products.filter((p) => (cat === "الكل" || p.category === cat) && p.name.includes(q));
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
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-10">
          <h2 className="text-2xl font-black">منتجات مميزة</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.id} p={p} pct={pctFor(p)} />)}
          </div>
        </section>
      )}

      <section id="shop" className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-black">المنتجات</h2>
          <div className="relative md:w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن منتج..." className="w-full rounded-full border border-input bg-card py-2 pr-9 pl-4 outline-none focus:border-accent" />
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${cat === c ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{c}</button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} p={p} pct={pctFor(p)} />)}
        </div>
        {!isLoading && list.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد نتائج</p>}
      </section>
    </main>
  );
}
