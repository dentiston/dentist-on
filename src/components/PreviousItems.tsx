import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/lib/customer";
import { useCart } from "@/lib/cart";
import { imgSrc, soldOut, unitPrice, useProducts, type Product } from "@/lib/products";
import { Price } from "@/components/Price";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Sug = { p: Product; qty: number; n: number };

// المواد التي طلبها الزبون سابقاً: الأكثر تكراراً أولاً، ثم الأحدث، بآخر كمية طلبها
function usePreviousItems(): Sug[] {
  const { customer } = useCustomer();
  const { data: products = [] } = useProducts();
  const approved = customer?.status === "approved";
  const { data: orders = [] } = useQuery({
    queryKey: ["prev-orders"],
    enabled: approved,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("items, created_at").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data as unknown as { items: { id?: string; name: string; qty: number }[] | null }[];
    },
  });
  return useMemo(() => {
    const m = new Map<string, Sug & { last: number }>();
    orders.forEach((o, idx) => {
      (o.items ?? []).forEach((i) => {
        const p = products.find((x) => x.id === i.id) ?? products.find((x) => x.name === i.name);
        if (!p || !p.active || soldOut(p)) return;
        const e = m.get(p.id);
        if (e) e.n += 1; else m.set(p.id, { p, qty: Math.max(1, Number(i.qty) || 1), n: 1, last: idx });
      });
    });
    return [...m.values()].sort((a, b) => b.n - a.n || a.last - b.last).slice(0, 8);
  }, [orders, products]);
}

export function PreviousItems() {
  const list = usePreviousItems();
  const { add, addMany } = useCart();
  if (list.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-black">اشتريتَ سابقاً</h2>
        <button
          onClick={() => { addMany(list.map((s) => ({ id: s.p.id, qty: s.qty }))); toast.success("أُضيفت المواد إلى السلة"); }}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground"
        >أضف الكل للسلة</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {list.map(({ p, qty }) => (
          <div key={p.id} className="flex flex-col rounded-2xl border border-border bg-card p-3">
            <img src={imgSrc(p.image)} alt={p.name} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
            <div className="mt-2 line-clamp-2 text-sm font-bold">{p.name}</div>
            <div className="text-xs text-muted-foreground"><Price usd={unitPrice(p, qty)} usdToo={false} /> للقطعة</div>
            <button
              onClick={() => { add(p.id, qty); toast.success("أُضيف إلى السلة"); }}
              className="mt-2 rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground"
            >أضف × {qty}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

// نافذة تظهر مرة واحدة في كل جلسة عند أول فتح للمتجر
export function FirstOpenSuggest({ enabled }: { enabled: boolean }) {
  const list = usePreviousItems();
  const { addMany } = useCart();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!enabled || list.length === 0) return;
    try {
      if (sessionStorage.getItem("prev-shown")) return;
      sessionStorage.setItem("prev-shown", "1");
    } catch { return; }
    setOpen(true);
  }, [enabled, list.length]);

  const chosen = list.filter((s) => sel[s.p.id] !== false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>أهلاً بعودتك — هل تحتاج هذه المواد مجدداً؟</DialogTitle>
          <DialogDescription>طلبتها سابقاً. اختر ما تريد وأضفه لسلتك بضغطة واحدة.</DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {list.map(({ p, qty }) => (
            <label key={p.id} className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={sel[p.id] !== false} onChange={(e) => setSel({ ...sel, [p.id]: e.target.checked })} />
              <span className="flex-1">{p.name}</span>
              <b>× {qty}</b>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            disabled={chosen.length === 0}
            onClick={() => { addMany(chosen.map((s) => ({ id: s.p.id, qty: s.qty }))); toast.success("أُضيفت المواد إلى السلة"); setOpen(false); }}
            className="flex-1 rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
          >أضف المحدد للسلة</button>
          <button onClick={() => setOpen(false)} className="rounded-full bg-muted px-5 py-3">لاحقاً</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
