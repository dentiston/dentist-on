import { ProductReviews } from "@/components/ProductReviews";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useProducts, unitPrice, imgSrc, soldOut, productsQuery } from "@/lib/products";
import { Price } from "@/components/Price";
import { Gallery } from "@/components/Gallery";
import { ShareButton } from "@/components/ShareButton";
import { WatchButton } from "@/components/WatchButton";
import { useCart } from "@/lib/cart";
import { useDiscounts } from "@/lib/promos";
import { SITE_URL } from "@/lib/store";
import { LogoLoader } from "@/components/LogoLoader";

export const Route = createFileRoute("/product/$id")({
  // يُحمَّل المنتج على الخادم ليظهر اسمه وصورته في معاينة واتساب وفي نتائج البحث
  loader: async ({ context, params }) => {
    try {
      const products = await context.queryClient.ensureQueryData(productsQuery);
      return { product: products.find((x) => x.id === params.id) ?? null };
    } catch {
      return { product: null };
    }
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.product;
    const title = p ? `${p.name} | Dentist On` : "تفاصيل المنتج | Dentist On";
    const desc = p
      ? (p.description || `${p.name}${p.brand ? ` من ${p.brand}` : ""} بسعر جملة في Dentist On.`).slice(0, 160)
      : "تفاصيل المنتج وأسعار الجملة في Dentist On.";
    const src = p ? imgSrc(p.image) : "";
    const img = src.startsWith("http") ? src : SITE_URL && src.startsWith("/") ? `${SITE_URL}${src}` : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        ...(SITE_URL ? [{ property: "og:url", content: `${SITE_URL}/product/${params.id}` }] : []),
        ...(img ? [{ property: "og:image", content: img }] : []),
        { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
      ],
      // بيانات منتج منظمة: يظهر السعر والتوفر تحت المنتج في نتائج غوغل
      scripts: p
        ? [{
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: p.name,
              description: desc,
              ...(img ? { image: [img] } : {}),
              ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
              category: p.category,
              offers: {
                "@type": "Offer",
                url: SITE_URL ? `${SITE_URL}/product/${params.id}` : undefined,
                priceCurrency: "USD",
                price: Number(p.price).toFixed(2),
                availability: p.stock != null && p.stock <= 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
                itemCondition: "https://schema.org/NewCondition",
              },
            }).replace(/</g, "\\u003c"),
          }]
        : [],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useProducts();
  const p = data?.find((x) => x.id === id);
  const { add } = useCart();
  const pctFor = useDiscounts();
  const [qty, setQty] = useState(1);
  if (isLoading) return <main><LogoLoader /></main>;
  if (!p) return <main className="py-20 text-center">المنتج غير موجود. <Link to="/" className="font-bold underline">العودة</Link></main>;
  const pct = pctFor(p);
  const out = soldOut(p);
  const max = p.stock ?? Infinity;
  return (
    <>
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <Gallery p={p} />
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
        {out ? (
          <div className="mt-6 space-y-2">
            <div className="font-bold text-destructive">نفد المخزون حالياً</div>
            <WatchButton productId={p.id} />
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-input">
              <button className="px-4 py-2 text-lg" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button className="px-4 py-2 text-lg" onClick={() => setQty(Math.min(qty + 1, max))}>+</button>
            </div>
            <button onClick={() => { add(p.id, qty); toast.success("أُضيف إلى السلة"); }} className="flex-1 rounded-full bg-primary py-3 font-bold text-primary-foreground">
              أضف للسلة — <Price usd={unitPrice(p, qty, pct) * qty} usdToo={false} />
            </button>
          </div>
        )}
        <div className="mt-4"><ShareButton id={p.id} name={p.name} /></div>
      </div>
    </main>
    <ProductReviews productId={p.id} />
    </>
  );
}
