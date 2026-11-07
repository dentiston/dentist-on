import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useProducts, unitPrice, imgSrc, type Product } from "@/lib/products";
import { autoPercent, promoMatches, usePromotions } from "@/lib/promos";
import { Price } from "@/components/Price";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { useCustomer } from "@/lib/customer";
import { OrderTracker } from "@/components/OrderTracker";
import { PHONE_PATTERN, WA_NUMBER, orderMessage, waLink } from "@/lib/store";
import { useShopConfig } from "@/lib/config";
import { fmt } from "@/lib/products";

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

type Coupon = { name: string; percent: number; scope: string; target: string | null; min_order: number };

function CartPage() {
  const { cart, set, clear } = useCart();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [waText, setWaText] = useState("");
  const { data: products = [] } = useProducts();
  const { session, customer, loading: custLoading } = useCustomer();
  const canOrder = customer?.status === "approved";
  const { data: cfg } = useShopConfig();
  const [zone, setZone] = useState("");
  const disc = Number(customer?.discount_percent ?? 0);
  const zones = cfg?.zones ?? {};
  const zoneNames = Object.keys(zones);
  const minOrder = cfg?.minOrder ?? 0;
  const { data: promos = [] } = usePromotions();
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  // الأفضل للزبون بين: خصم حسابه، الخصم التلقائي، القسيمة (لا تتراكم)
  const linePct = (p: Product) => Math.max(disc, autoPercent(p, promos), coupon && promoMatches(coupon, p) ? Number(coupon.percent) : 0);
  const items = products.filter((p) => cart[p.id]).map((p) => ({ p, qty: cart[p.id] ?? 0 }));
  const total = items.reduce((s, { p, qty }) => s + unitPrice(p, qty, linePct(p)) * qty, 0);
  const listSub = items.reduce((s, { p, qty }) => s + unitPrice(p, qty) * qty, 0);
  const couponBelowMin = !!coupon && listSub < Number(coupon.min_order);
  const applyCoupon = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { data, error } = await supabase.rpc("check_coupon", { p_code: c });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) { setCoupon(null); toast.error("كود الخصم غير صالح أو منتهٍ"); return; }
    setCoupon(row as unknown as Coupon);
    toast.success("تم تطبيق الكود");
  };
  const fee = zoneNames.length ? Number(zones[zone] ?? 0) : 0;
  const grand = total + fee;
  const belowMin = minOrder > 0 && total < minOrder;

  if (done) return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-black">تم استلام طلبك ✓</h1>
      <p className="mt-3 text-muted-foreground">سنتواصل معك لتأكيد التوصيل.</p>
      {orderId && <p className="mt-2 text-sm text-muted-foreground">رقم الطلب: <b dir="ltr">{orderId.slice(0, 8).toUpperCase()}</b></p>}
      <p className="mt-2 text-sm text-muted-foreground">يمكنك متابعة حالة الطلب في قسم «تتبع طلبك» أسفل صفحة السلة.</p>
      {WA_NUMBER && waText && (
        <a href={waLink(waText)} target="_blank" rel="noreferrer" className="mt-6 block rounded-full bg-accent px-6 py-3 font-bold text-accent-foreground">أرسل تفاصيل الطلب عبر واتساب لتسريع التأكيد</a>
      )}
      <button onClick={() => setDone(false)} className="mt-3 block w-full rounded-full bg-muted px-6 py-3 font-bold">تتبع طلبك</button>
      <Link to="/" className="mt-3 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">متابعة التسوق</Link>
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
                  <div className="text-sm text-muted-foreground"><Price usd={unitPrice(p, qty, linePct(p))} usdToo={false} /> للقطعة {qty >= 10 && "· سعر جملة"}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="h-8 w-8 rounded-full bg-muted" onClick={() => set(p.id, qty - 1)}>−</button>
                    <span className="w-6 text-center font-bold">{qty}</span>
                    <button className="h-8 w-8 rounded-full bg-muted" onClick={() => set(p.id, qty + 1)}>+</button>
                  </div>
                </div>
                <div className="text-left">
                  <Price usd={unitPrice(p, qty, linePct(p)) * qty} className="block font-black" />
                  <button aria-label="حذف" onClick={() => set(p.id, 0)} className="mt-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <form
            key={customer?.user_id ?? "guest"}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canOrder) return;
              const f = new FormData(e.currentTarget);
              setBusy(true);
              // الخادم يعيد حساب الأسعار وسعر الصرف؛ نرسل فقط المعرّف والكمية
              const { data: id, error } = await supabase.rpc("place_order", {
                p_name: String(f.get("name")), p_phone: String(f.get("phone")), p_address: String(f.get("address")),
                p_items: items.map(({ p, qty }) => ({ id: p.id, qty })),
                p_zone: zoneNames.length ? zone : null,
                p_coupon: coupon ? code.trim().toUpperCase() : null,
              });
              setBusy(false);
              if (error) {
                toast.error(error.message.includes("account not approved") ? "حسابك بانتظار الموافقة" : error.message.includes("below minimum") ? "الطلب أقل من الحد الأدنى" : error.message.includes("zone required") ? "اختر منطقة التوصيل" : error.message.includes("invalid coupon") ? "كود الخصم غير صالح أو انتهى" : error.message.includes("coupon minimum") ? "الطلب أقل من الحد الأدنى للقسيمة" : error.message.includes("product unavailable") ? "أحد المنتجات لم يعد متوفرًا، حدّث السلة" : "تعذر إرسال الطلب، تأكد من البيانات وحاول مجددًا");
                return;
              }
              setWaText(orderMessage(String(id), String(f.get("name")), items.map(({ p, qty }) => ({ name: p.name, qty })), fmt(grand)));
              setOrderId(String(id)); clear(); setDone(true);
            }}
            className="h-fit space-y-3 rounded-2xl bg-secondary p-5"
          >
            {(listSub - total > 0.005 || fee > 0) && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between"><span>المجموع</span><Price usd={listSub} usdToo={false} /></div>
                {listSub - total > 0.005 && <div className="flex justify-between"><span>إجمالي الخصومات</span><span>−<Price usd={listSub - total} usdToo={false} /></span></div>}
                {fee > 0 && <div className="flex justify-between"><span>رسوم التوصيل</span><Price usd={fee} usdToo={false} /></div>}
              </div>
            )}
            <div className="flex justify-between text-lg"><span>الإجمالي</span><b className="text-left"><Price usd={grand} /></b></div>
            {!canOrder && !custLoading && (
              <div className="rounded-xl bg-card p-3 text-sm">
                {!session ? (
                  <>جهّز سلتك الآن، ولإرسال الطلب سجّل حساب عيادتك. <Link to="/account" className="font-bold text-primary underline">تسجيل / دخول</Link></>
                ) : customer?.status === "rejected" ? "تعذّر قبول حسابك. تواصل معنا لمعرفة السبب."
                : "حسابك قيد المراجعة. جهّز سلتك، وسنراسلك على واتساب عند الموافقة لإكمال الطلب."}
              </div>
            )}
            {belowMin && <div className="rounded-xl bg-card p-3 text-sm text-destructive">الحد الأدنى للطلب <Price usd={minOrder} usdToo={false} /> — أضف منتجات بقيمة <Price usd={minOrder - total} usdToo={false} /> لتتمكن من الإرسال.</div>}
            {zoneNames.length > 0 && (
              <select name="zone" required value={zone} onChange={(e) => setZone(e.target.value)} className="w-full rounded-xl border border-input bg-card px-3 py-2">
                <option value="" disabled>اختر منطقة التوصيل</option>
                {zoneNames.map((z) => <option key={z} value={z}>{z} — {fmt(Number(zones[z]))}</option>)}
              </select>
            )}
            <div>
              <div className="flex gap-2">
                <input value={code} onChange={(e) => { setCode(e.target.value); setCoupon(null); }} placeholder="كود الخصم (اختياري)" dir="ltr" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
                <button type="button" onClick={applyCoupon} className="shrink-0 rounded-xl bg-muted px-4 font-bold">تطبيق</button>
              </div>
              {coupon && <div className="mt-1 text-xs font-bold text-primary">تم تطبيق «{coupon.name}» — خصم {coupon.percent}%</div>}
              {couponBelowMin && <div className="mt-1 text-xs text-destructive">القسيمة تتطلب طلباً بقيمة <Price usd={Number(coupon?.min_order ?? 0)} usdToo={false} /> على الأقل</div>}
            </div>
            <input name="name" required defaultValue={customer?.clinic_name} placeholder="اسم العيادة / الطبيب" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <input name="phone" required defaultValue={customer?.phone} type="tel" pattern={PHONE_PATTERN} title="أرقام لاتينية فقط، مثال 0944123456" placeholder="رقم الهاتف" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <input name="address" required defaultValue={customer?.address} placeholder="العنوان" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <p className="text-xs text-muted-foreground">يُحتسب السعر النهائي بسعر الصرف لحظة تأكيد الطلب.</p>
            <button disabled={busy || !canOrder || belowMin || couponBelowMin || (zoneNames.length > 0 && !zone)} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">{busy ? "جارِ الإرسال…" : "تأكيد الطلب"}</button>
          </form>
        </div>
      )}
      <OrderTracker approved={canOrder} />
    </main>
  );
}
