import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmt, soldOut, useProducts } from "@/lib/products";
import { useCart } from "@/lib/cart";

const steps = ["جديد", "قيد التجهيز", "تم الشحن", "مكتمل"];
type Row = { id?: string; status: string; total: number; created_at: string; items: { id?: string; name: string; qty: number }[] };
const input = "w-full rounded-xl border border-input bg-card px-3 py-2";

function Progress({ status }: { status: string }) {
  if (status === "ملغي") return <div className="font-bold text-destructive">تم إلغاء الطلب</div>;
  const idx = steps.indexOf(status);
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center gap-1 ${i <= idx ? "font-bold" : "text-muted-foreground"}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />{s}
        </li>
      ))}
    </ol>
  );
}

function OrderCard({ o, onReorder }: { o: Row; onReorder?: (o: Row) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          {o.id && <b dir="ltr">{o.id.slice(0, 8).toUpperCase()}</b>}
          <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ar")}</div>
        </div>
        <b>{fmt(Number(o.total))}</b>
      </div>
      <div className="mt-3"><Progress status={o.status} /></div>
      <ul className="mt-3 space-y-0.5 border-t border-border pt-3 text-sm">
        {(o.items ?? []).map((i, k) => <li key={k}>{i.name} × {i.qty}</li>)}
      </ul>
      {onReorder && <button onClick={() => onReorder(o)} className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground">أعد الطلب</button>}
    </div>
  );
}

// زبون مفعّل: يرى طلباته مباشرة. غير ذلك: بحث برقم الطلب + الهاتف.
export function OrderTracker({ approved }: { approved: boolean }) {
  const { data: mine = [], isLoading } = useQuery({
    queryKey: ["cart-my-orders"],
    enabled: approved,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,status,total,created_at,items").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });
  const { data: products = [] } = useProducts();
  const { addMany } = useCart();
  const reorder = (o: Row) => {
    const list: { id: string; qty: number }[] = [];
    let miss = 0;
    for (const i of o.items ?? []) {
      const p = products.find((x) => x.id === i.id) ?? products.find((x) => x.name === i.name);
      if (p && !soldOut(p)) list.push({ id: p.id, qty: i.qty }); else miss++;
    }
    if (list.length === 0) { toast.error("منتجات هذا الطلب غير متوفرة حالياً"); return; }
    addMany(list);
    toast.success(`أُضيفت ${list.length} منتجات إلى السلة${miss ? ` (${miss} غير متوفرة)` : ""}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Row | null>(null);
  const [error, setError] = useState("");

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-black">تتبع طلبك</h2>
      {approved ? (
        <div className="mt-4 space-y-3">
          {isLoading && <p className="text-muted-foreground">جارِ التحميل…</p>}
          {!isLoading && mine.length === 0 && <p className="text-muted-foreground">لا توجد طلبات بعد.</p>}
          {mine.map((o) => <OrderCard key={o.id} o={o} onReorder={reorder} />)}
        </div>
      ) : (
        <>
          <form
            className="mt-4 grid max-w-md gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true); setError(""); setFound(null);
              const { data, error: err } = await supabase.rpc("track_order", { p_ref: String(f.get("ref")).trim(), p_phone: String(f.get("phone")).trim() });
              setBusy(false);
              const row = Array.isArray(data) ? data[0] : null;
              if (err || !row) { setError("لم نجد طلباً بهذه البيانات. تأكد من رقم الطلب ورقم الهاتف المستخدم عند الطلب."); return; }
              setFound(row as unknown as Row);
            }}
          >
            <input name="ref" required minLength={8} placeholder="رقم الطلب (8 خانات)" className={input} dir="ltr" />
            <input name="phone" required type="tel" placeholder="رقم الهاتف" className={input} dir="ltr" />
            <button disabled={busy} className="rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">{busy ? "جارِ البحث…" : "تتبع"}</button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {found && <div className="mt-4 max-w-md"><OrderCard o={found} /></div>}
        </>
      )}
    </section>
  );
}
