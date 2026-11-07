import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useProducts, unitPrice, imgSrc, soldOut } from "@/lib/products";
import { Price } from "@/components/Price";
import { useCart } from "@/lib/cart";
import { useDiscounts } from "@/lib/promos";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل المنتج | Dentist On" },
      { name: "description", content: "تفاصيل المنتج وأسعار الجملة في Dentist On." },
      { property: "og:title", content: "تفاصيل المنتج | Dentist On" },
      { property: "og:description", content: "تفاصيل المنتج وأسعار الجملة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useProducts();
  const p = data?.find((x) => x.id === id);
  const { add } = useCart();
  const pctFor = useDiscounts();
  const [qty, setQty] = useState(1);
  if (isLoading) return <main className="py-20 text-center text-muted-foreground">جارِ التحميل…</main>;
  if (!p) return <main className="py-20 text-center">المنتج غير موجود. <Link to="/" className="font-bold underline">العودة</Link></main>;
  const pct = pctFor(p);
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <img src={imgSrc(p.image)} alt={p.name} width={816} height={816} className="w-full rounded-3xl bg-muted object-cover" />
      <div>
        <Link to="/" className="text-sm text-muted-foreground">← {p.category}</Link>
        <div className="mt-3 text-sm font-semibold text-muted-foreground">{p.brand}</div>
        <h1 className="text-3xl font-black">{p.name}</h1>
        <p className="mt-4 text-muted-foreground">{p.description}</p>
        <div className="mt-6 rounded-2xl bg-secondary p-4">
          {pct > 0 && <div className="mb-2 inline-block rounded-full bg-accent px-3 py-0.5 text-sm font-black text-accent-foreground">خصم {pct}%</div>}
          <div className="flex justify-between"><span>سعر القطعة</span><b className="text-left">{pct > 0 && <s className="block text-xs font-normal text-muted-foreground"><Price usd={p.price} usdToo={false} /></s>}<Price usd={unitPrice(p, 1, pct)} /></b></div>
          <div className="mt-2 flex justify-between"><span>سعر الجملة (10+)</span><b className="text-left text-primary">{pct > 0 && <s className="block text-xs font-normal text-muted-foreground"><Price usd={p.bulk_price} usdToo={false} /></s>}<Price usd={unitPrice(p, 10, pct)} /></b></div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center rounded-full border border-input">
            <button className="px-4 py-2 text-lg" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button className="px-4 py-2 text-lg" onClick={() => setQty(qty + 1)}>+</button>
          </div>
          <button disabled={soldOut(p)} onClick={() => { add(p.id, qty); toast.success("أُضيف إلى السلة"); }} className="flex-1 rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {soldOut(p) ? "نفد المخزون" : <>أضف للسلة — <Price usd={unitPrice(p, qty, pct) * qty} usdToo={false} /></>}
          </button>
        </div>
      </div>
    </main>
  );
}
