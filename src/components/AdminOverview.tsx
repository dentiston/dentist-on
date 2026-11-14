import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowLeft, Banknote, MessageCircle, Plus, Settings, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmt, useProducts } from "@/lib/products";
import { useShopConfig } from "@/lib/config";
import { statusMessage, waLinkTo } from "@/lib/store";

export type OrderLite = { id: string; customer_name: string; phone: string; total: number | string; status: string; created_at: string; paid?: boolean | null; items?: unknown };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const greeting = () => { const h = new Date().getHours(); return h < 5 ? "مساء الخير" : h < 12 ? "صباح الخير" : h < 18 ? "مرحباً" : "مساء الخير"; };

// أكثر المنتجات مبيعاً من عناصر الطلبات (يتجاهل أي شكل غير متوقع)
function topSellers(orders: OrderLite[]) {
  const m = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "ملغي" || !Array.isArray(o.items)) continue;
    for (const it of o.items as Record<string, unknown>[]) {
      const name = String(it?.["name"] ?? it?.["title"] ?? "");
      const qty = Number(it?.["qty"] ?? it?.["quantity"] ?? 0);
      if (name && qty > 0) m.set(name, (m.get(name) ?? 0) + qty);
    }
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

export function AdminOverview({ orders, badges, statuses, go }: { orders: OrderLite[]; badges: Record<string, number>; statuses: string[]; go: (t: string) => void }) {
  const qc = useQueryClient();
  const { data: products = [] } = useProducts();
  const { data: cfg } = useShopConfig();
  const live = orders.filter((o) => o.status !== "ملغي");
  const now = new Date();
  const stats = useMemo(() => {
    const sum = (f: (d: Date) => boolean) => live.filter((o) => f(new Date(o.created_at))).reduce((s, o) => s + Number(o.total), 0);
    const cnt = (f: (d: Date) => boolean) => live.filter((o) => f(new Date(o.created_at))).length;
    const today = (d: Date) => dayKey(d) === dayKey(new Date());
    const week = (d: Date) => Date.now() - d.getTime() < 7 * 864e5;
    const month = (d: Date) => d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    const series = Array.from({ length: 14 }, (_, k) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - k));
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, total: Math.round(live.filter((o) => dayKey(new Date(o.created_at)) === dayKey(d)).reduce((s, o) => s + Number(o.total), 0) * 100) / 100 };
    });
    return { today: sum(today), todayN: cnt(today), week: sum(week), weekN: cnt(week), month: sum(month), monthN: cnt(month), series };
  }, [live]);
  const unpaid = live.filter((o) => !o.paid).reduce((s, o) => s + Number(o.total), 0);
  const lowLimit = cfg?.lowStock ?? 5;
  const low = products.filter((p) => p.active && p.stock != null && p.stock <= lowLimit).sort((a, b) => Number(a.stock) - Number(b.stock));
  const sellers = useMemo(() => topSellers(orders), [orders]);
  const recent = orders.slice(0, 6);

  const attention = [
    { id: "orders", label: "طلبات جديدة", n: badges["orders"] ?? 0 },
    { id: "customers", label: "حسابات بانتظار الموافقة", n: badges["customers"] ?? 0 },
    { id: "requests", label: "طلبات توفر جديدة", n: badges["requests"] ?? 0 },
    { id: "services", label: "طلبات إضافية وصيانة", n: badges["services"] ?? 0 },
    { id: "used", label: "مستعمل بانتظار الموافقة", n: badges["used"] ?? 0 },
    { id: "products", label: "منتجات مخزونها منخفض", n: low.length },
  ];
  const card = "rounded-3xl border border-border bg-card p-4";
  return (
    <section className="mt-5 space-y-5">
      <div className="rounded-3xl bg-primary p-5 text-primary-foreground">
        <div className="text-sm opacity-80">{now.toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" })}</div>
        <div className="text-2xl font-black">{greeting()}، هذا ملخص متجرك</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:gap-4">
          {[["اليوم", stats.today, stats.todayN], ["آخر 7 أيام", stats.week, stats.weekN], ["هذا الشهر", stats.month, stats.monthN]].map(([l, v, n]) => (
            <div key={String(l)} className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs opacity-80">{l}</div>
              <div className="text-lg font-black sm:text-2xl">{fmt(Number(v))}</div>
              <div className="text-[11px] opacity-70">{n} طلب</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {attention.map((a) => (
          <button key={a.id} type="button" onClick={() => go(a.id)}
            className={`admin-card rounded-2xl border p-3 text-start transition hover:-translate-y-0.5 hover:shadow-md active:scale-[.98] ${a.n > 0 ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between"><span className={`text-2xl font-black ${a.n > 0 ? "" : "text-muted-foreground"}`}>{a.n}</span>{a.n > 0 && <span className="admin-pulse h-2.5 w-2.5 rounded-full bg-accent" />}</div>
            <div className="mt-1 text-xs font-bold leading-snug">{a.label}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between"><h2 className="font-black">المبيعات آخر 14 يوماً</h2><span className="flex items-center gap-1 text-xs text-muted-foreground"><Banknote className="h-3.5 w-3.5" /> غير محصّل: <b>{fmt(unpaid)}</b></span></div>
          <div className="mt-3 h-52 w-full text-accent" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.series}>
                <defs><linearGradient id="adm-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity={0.45} /><stop offset="100%" stopColor="currentColor" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={11} interval={1} />
                <YAxis fontSize={11} width={36} />
                <Tooltip formatter={(v) => [fmt(Number(v)), "المبيعات"]} />
                <Area type="monotone" dataKey="total" stroke="currentColor" strokeWidth={2} fill="url(#adm-g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={card}>
          <h2 className="font-black">اختصارات سريعة</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold">
            {[
              { id: "products", t: "منتج جديد", I: Plus }, { id: "customers", t: "العملاء", I: Users },
              { id: "rate", t: "سعر الصرف", I: Settings }, { id: "promos", t: "خصم جديد", I: Plus },
            ].map(({ id, t, I }) => (
              <button key={t} type="button" onClick={() => go(id)} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-3 transition hover:bg-secondary active:scale-95"><I className="h-4 w-4" />{t}</button>
            ))}
          </div>
          {sellers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-black">الأكثر مبيعاً</h3>
              <ol className="mt-2 space-y-1.5 text-sm">
                {sellers.map(([name, n], k) => (
                  <li key={name} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-black text-accent-foreground">{k + 1}</span><span className="min-w-0 flex-1 truncate">{name}</span><b>{n}</b></li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between"><h2 className="font-black">آخر الطلبات</h2><button type="button" onClick={() => go("orders")} className="flex items-center gap-1 text-xs font-bold text-primary underline">كل الطلبات <ArrowLeft className="h-3 w-3" /></button></div>
          {recent.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">لا توجد طلبات بعد</p>}
          <ul className="mt-3 divide-y divide-border">
            {recent.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{o.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar")}</div>
                </div>
                <b>{fmt(Number(o.total))}</b>
                <select value={o.status} aria-label="حالة الطلب"
                  onChange={async (e) => {
                    const status = e.target.value;
                    const { error } = await supabase.from("orders").update({ status }).eq("id", o.id);
                    if (error) { toast.error("تعذر التحديث"); return; }
                    qc.invalidateQueries({ queryKey: ["orders"] });
                    toast.success("تم تحديث الحالة", { duration: 12000, action: { label: "أبلغ الزبون", onClick: () => window.open(waLinkTo(o.phone, statusMessage(o.customer_name, o.id, status)), "_blank") } });
                  }}
                  className="rounded-lg border border-input bg-card px-2 py-1 text-sm">
                  {statuses.map((s) => <option key={s}>{s}</option>)}
                </select>
                <a href={waLinkTo(o.phone, statusMessage(o.customer_name, o.id, o.status))} target="_blank" rel="noreferrer" aria-label="واتساب للزبون" className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-black transition active:scale-90"><MessageCircle className="h-4 w-4" /></a>
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h2 className="flex items-center gap-2 font-black"><AlertTriangle className="h-4 w-4 text-accent" /> مخزون منخفض</h2>
          {low.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">كل المنتجات بمخزون جيد</p>}
          <ul className="mt-3 space-y-1.5">
            {low.slice(0, 7).map((p) => (
              <li key={p.id}><button type="button" onClick={() => go("products")} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition hover:bg-muted"><span className="min-w-0 flex-1 truncate text-start">{p.name}</span><b className={Number(p.stock) <= 0 ? "text-destructive" : ""}>{Number(p.stock) <= 0 ? "نفد" : p.stock}</b></button></li>
            ))}
          </ul>
          {low.length > 7 && <button type="button" onClick={() => go("products")} className="mt-2 text-xs font-bold text-primary underline">و{low.length - 7} أخرى…</button>}
        </div>
      </div>
    </section>
  );
}
