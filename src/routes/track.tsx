import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/products";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "تتبع الطلب | Dentist On" },
      { name: "description", content: "تابع حالة طلبك برقم الطلب ورقم الهاتف." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackPage,
});

const steps = ["جديد", "قيد التجهيز", "تم الشحن", "مكتمل"];
type Result = { status: string; total: number; created_at: string; items: { name: string; qty: number }[] };

function TrackPage() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const input = "w-full rounded-xl border border-input bg-card px-3 py-2";
  const idx = res ? steps.indexOf(res.status) : -1;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-black">تتبع طلبك</h1>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true); setError(""); setRes(null);
          const { data, error: err } = await supabase.rpc("track_order", {
            p_ref: String(f.get("ref")).trim(), p_phone: String(f.get("phone")).trim(),
          });
          setBusy(false);
          const row = Array.isArray(data) ? data[0] : null;
          if (err || !row) { setError("لم نجد طلباً بهذه البيانات. تأكد من رقم الطلب ورقم الهاتف المستخدم عند الطلب."); return; }
          setRes(row as unknown as Result);
        }}
      >
        <input name="ref" required minLength={8} placeholder="رقم الطلب (8 خانات)" className={input} dir="ltr" />
        <input name="phone" required type="tel" placeholder="رقم الهاتف" className={input} dir="ltr" />
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "جارِ البحث…" : "تتبع الطلب"}
        </button>
      </form>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {res && (
        <section className="mt-6 rounded-2xl bg-secondary p-5">
          {res.status === "ملغي" ? (
            <div className="text-lg font-black text-destructive">تم إلغاء هذا الطلب</div>
          ) : (
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 ${i <= idx ? "font-bold" : "text-muted-foreground"}`}>
                  <span className={`h-3 w-3 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />{s}
                </li>
              ))}
            </ol>
          )}
          <ul className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            {res.items.map((i, k) => <li key={k}>{i.name} × {i.qty}</li>)}
          </ul>
          <div className="mt-3 flex justify-between border-t border-border pt-3"><span>الإجمالي</span><b>{fmt(Number(res.total))}</b></div>
        </section>
      )}
    </main>
  );
}
