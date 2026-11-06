import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useProducts, unitPrice, imgSrc } from "@/lib/products";
import { Price } from "@/components/Price";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة المشتريات | Dentist On" },
      { name: "description", content: "راجع طلبك من المواد والأدوات السنية وأكمل الشراء." },
      { property: "og:title", content: "سلة المشتريات | Dentist On" },
      { property: "og:description", content: "راجع طلبك وأكمل الشراء." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { cart, set, clear } = useCart();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState("");
  const { data: products = [] } = useProducts();
  const items = products.filter((p) => cart[p.id]).map((p) => ({ p, qty: cart[p.id] ?? 0 }));
  const total = items.reduce((s, { p, qty }) => s + unitPrice(p, qty) * qty, 0);

  if (done) return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-black">تم استلام طلبك ✓</h1>
      <p className="mt-3 text-muted-foreground">سنتواصل معك لتأكيد التوصيل.</p>
      {orderId && <p className="mt-2 text-sm text-muted-foreground">رقم الطلب: <b dir="ltr">{orderId.slice(0, 8).toUpperCase()}</b></p>}
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
                <img src={imgSrc(p.image)} alt={p.name} loading="lazy" className="h-20 w-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="font-bold leading-snug">{p.name}</div>
                  <div className="text-sm text-muted-foreground"><Price usd={unitPrice(p, qty)} usdToo={false} /> للقطعة {qty >= 10 && "· سعر جملة"}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="h-8 w-8 rounded-full bg-muted" onClick={() => set(p.id, qty - 1)}>−</button>
                    <span className="w-6 text-center font-bold">{qty}</span>
                    <button className="h-8 w-8 rounded-full bg-muted" onClick={() => set(p.id, qty + 1)}>+</button>
                  </div>
                </div>
                <div className="text-left">
                  <Price usd={unitPrice(p, qty) * qty} className="block font-black" />
                  <button aria-label="حذف" onClick={() => set(p.id, 0)} className="mt-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              // الخادم يعيد حساب الأسعار وسعر الصرف؛ نرسل فقط المعرّف والكمية
              const { data: id, error } = await supabase.rpc("place_order", {
                p_name: String(f.get("name")), p_phone: String(f.get("phone")), p_address: String(f.get("address")),
                p_items: items.map(({ p, qty }) => ({ id: p.id, qty })),
              });
              setBusy(false);
              if (error) {
                toast.error(error.message.includes("product unavailable") ? "أحد المنتجات لم يعد متوفرًا، حدّث السلة" : "تعذر إرسال الطلب، تأكد من البيانات وحاول مجددًا");
                return;
              }
              setOrderId(String(id)); clear(); setDone(true);
            }}
            className="h-fit space-y-3 rounded-2xl bg-secondary p-5"
          >
            <div className="flex justify-between text-lg"><span>الإجمالي</span><b className="text-left"><Price usd={total} /></b></div>
            <input name="name" required placeholder="اسم العيادة / الطبيب" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <input name="phone" required type="tel" placeholder="رقم الهاتف" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <input name="address" required placeholder="العنوان" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <p className="text-xs text-muted-foreground">يُحتسب السعر النهائي بسعر الصرف لحظة تأكيد الطلب.</p>
            <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">{busy ? "جارِ الإرسال…" : "تأكيد الطلب"}</button>
          </form>
        </div>
      )}
    </main>
  );
}
