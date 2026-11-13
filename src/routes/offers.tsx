import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Sparkles, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { imgSrc, useProducts, soldOut } from "@/lib/products";
import { AUDIENCES, bundleParts, bundleValue, isBundle, type Audience } from "@/lib/bundles";
import { useCart } from "@/lib/cart";
import { useCustomer } from "@/lib/customer";
import { ordersLink } from "@/lib/contacts";
import { Price } from "@/components/Price";
import { LogoLoader } from "@/components/LogoLoader";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "العروض والبكجات | Dentist On" },
      { name: "description", content: "باقات جاهزة من المواد والأدوات السنية بأسعار مخفّضة، مثالية لطلاب كليات طب الأسنان والعيادات الجديدة." },
      { property: "og:title", content: "العروض والبكجات | Dentist On" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const { data: products = [], isLoading } = useProducts();
  const { add } = useCart();
  const { customer } = useCustomer();
  const [aud, setAud] = useState<"all" | Audience>("all");
  const bundles = products.filter((p) => p.active && isBundle(p));
  const list = bundles.filter((b) => aud === "all" || (b.audience ?? "all") === aud || b.audience === "all");
  const chip = (k: "all" | Audience, label: string) => (
    <button key={k} onClick={() => setAud(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${aud === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{label}</button>
  );
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="relative overflow-hidden rounded-3xl bg-secondary p-6 sm:p-10">
        <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-foreground"><GraduationCap className="h-4 w-4" /> مثالية لطلاب الجامعات</span>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">العروض والبكجات</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">كل ما يحتاجه الطالب أو العيادة الجديدة في باقة واحدة، بسعر أقل من شراء القطع منفردة.</p>
      </div>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {chip("all", "الكل")}{chip("students", AUDIENCES.students)}{chip("clinics", AUDIENCES.clinics)}
      </div>
      {isLoading && <LogoLoader />}
      {!isLoading && list.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <Sparkles className="mx-auto h-8 w-8" />
          <p className="mt-3">لا توجد باقات في هذا القسم حالياً، تابعنا قريباً.</p>
        </div>
      )}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((b) => {
          const parts = bundleParts(b, products);
          const value = bundleValue(b, products);
          const save = value - Number(b.price);
          const out = soldOut(b);
          return (
            <article key={b.id} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
              <Link to="/product/$id" params={{ id: b.id }} className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img src={imgSrc(b.image)} alt={b.name} loading="lazy" className="h-full w-full object-cover" />
                {b.audience && b.audience !== "all" && (
                  <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-foreground">{AUDIENCES[b.audience as Audience] ?? ""}</span>
                )}
                {save > 0.005 && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">وفّر <Price usd={save} usdToo={false} /></span>}
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="text-lg font-black leading-snug">{b.name}</h2>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {parts.map((x) => <li key={x.id}>• {x.product!.name} × {x.qty}</li>)}
                </ul>
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <div>
                    <Price usd={Number(b.price)} className="block text-xl font-black" />
                    {save > 0.005 && <s className="text-xs text-muted-foreground"><Price usd={value} usdToo={false} /></s>}
                  </div>
                  <button disabled={out} onClick={() => { add(b.id); toast.success("أُضيفت الباقة إلى السلة"); }}
                    className="rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground disabled:opacity-40">{out ? "نفدت" : "أضف للسلة"}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <a href={ordersLink("باقة مخصّصة حسب احتياجي", customer?.clinic_name)} target="_blank" rel="noreferrer"
        className="mt-10 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-bold text-black">
        <MessageCircle className="h-5 w-5" /> تريد باقة مخصّصة؟ كلّمنا على واتساب
      </a>
    </main>
  );
}
