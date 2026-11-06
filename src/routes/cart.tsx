import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { products, fmt, unitPrice } from "@/lib/products";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة المشتريات | Dentist On" },
      { name: "description", content: "راجع طلبك من المواد والأدوات السنية وأكمل الشراء." },
      { property: "og:title", content: "سلة المشتريات | Dentist On" },
      { property: "og:description", content: "راجع طلبك وأكمل الشراء." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { cart, set, clear } = useCart();
  const [done, setDone] = useState(false);
  const items = products.filter((p) => cart[p.id]).map((p) => ({ p, qty: cart[p.id] ?? 0 }));
  const total = items.reduce((s, { p, qty }) => s + unitPrice(p, qty) * qty, 0);

  if (done) return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-black">تم استلام طلبك ✓</h1>
      <p className="mt-3 text-muted-foreground">سنتواصل معك لتأكيد التوصيل.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">متابعة التسوق</Link>
    </main>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black">سلة المشتريات</h1>
      {items.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">السلة فارغة. <Link to="/" className="font-bold text-primary underline">تسوّق الآن</Link></p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            {items.map(({ p, qty }) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <img src={p.image} alt={p.name} loading="lazy" className="h-20 w-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="font-bold leading-snug">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{fmt(unitPrice(p, qty))} للقطعة {qty >= 10 && "· سعر جملة"}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="h-8 w-8 rounded-full bg-muted" onClick={() => set(p.id, qty - 1)}>−</button>
                    <span className="w-6 text-center font-bold">{qty}</span>
                    <button className="h-8 w-8 rounded-full bg-muted" onClick={() => set(p.id, qty + 1)}>+</button>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-black">{fmt(unitPrice(p, qty) * qty)}</div>
                  <button aria-label="حذف" onClick={() => set(p.id, 0)} className="mt-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); clear(); setDone(true); }}
            className="h-fit space-y-3 rounded-2xl bg-secondary p-5"
          >
            <div className="flex justify-between text-lg"><span>الإجمالي</span><b>{fmt(total)}</b></div>
            <input required placeholder="اسم العيادة / الطبيب" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <input required type="tel" placeholder="رقم الهاتف" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <input required placeholder="العنوان" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <button className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">تأكيد الطلب</button>
          </form>
        </div>
      )}
    </main>
  );
}
