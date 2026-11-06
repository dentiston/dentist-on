import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { products, fmt, unitPrice } from "@/lib/products";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const p = products.find((x) => x.id === params.id);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} | Dentist On` : "Unavailable | Dentist On" },
      { name: "description", content: loaderData?.description ?? "" },
      { property: "og:title", content: loaderData?.name ?? "Dentist On" },
      { property: "og:description", content: loaderData?.description ?? "" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const p = Route.useLoaderData();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <img src={p.image} alt={p.name} width={816} height={816} className="w-full rounded-3xl bg-muted object-cover" />
      <div>
        <Link to="/" className="text-sm text-muted-foreground">← {p.category}</Link>
        <div className="mt-3 text-sm font-semibold text-muted-foreground">{p.brand}</div>
        <h1 className="text-3xl font-black">{p.name}</h1>
        <p className="mt-4 text-muted-foreground">{p.description}</p>
        <div className="mt-6 rounded-2xl bg-secondary p-4">
          <div className="flex justify-between"><span>سعر القطعة</span><b>{fmt(p.price)}</b></div>
          <div className="flex justify-between"><span>سعر الجملة (10+)</span><b className="text-primary">{fmt(p.bulkPrice)}</b></div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center rounded-full border border-input">
            <button className="px-4 py-2 text-lg" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button className="px-4 py-2 text-lg" onClick={() => setQty(qty + 1)}>+</button>
          </div>
          <button onClick={() => { add(p.id, qty); toast.success("أُضيف إلى السلة"); }} className="flex-1 rounded-full bg-primary py-3 font-bold text-primary-foreground">
            أضف للسلة — {fmt(unitPrice(p, qty) * qty)}
          </button>
        </div>
      </div>
    </main>
  );
}
