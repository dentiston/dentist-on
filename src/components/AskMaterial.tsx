import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/lib/customer";
import { useProducts, soldOut } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { Price } from "@/components/Price";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const input = "w-full rounded-xl border border-input bg-card px-3 py-2";

const errorText = (m: string) =>
  m.includes("too many open") ? "لديك 5 طلبات مفتوحة، انتظر الردّ على بعضها"
  : m.includes("slow down") ? "انتظر لحظات قبل إرسال طلب آخر"
  : m.includes("not approved") ? "حسابك بانتظار الموافقة"
  : "تعذّر إرسال الطلب، تأكد من البيانات";

// «اسأل عن مادة»: زر عائم (افتراضي) أو زر عادي داخل الصفحة (inline). للزبون المفعّل فقط.
export function AskMaterial({ inline = false }: { inline?: boolean }) {
  const { session, customer } = useCustomer();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!session || customer?.status !== "approved") return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={inline
          ? "inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold"
          : "fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 font-bold text-accent-foreground shadow-lg"}
      >
        <MessageCircle className="h-4 w-4" /> اسأل عن مادة
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>اسأل عن مادة</DialogTitle>
            <DialogDescription>مادة غير موجودة في المتجر؟ أخبرنا وسنردّ عليك بالتوفر والسعر.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              const file = f.get("image") as File | null;
              setBusy(true);
              let imageUrl: string | undefined;
              if (file && file.size > 0) {
                if (file.size > 3 * 1024 * 1024) { toast.error("حجم الصورة أكبر من 3MB"); setBusy(false); return; }
                const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
                const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
                const { error: upErr } = await supabase.storage.from("request-images").upload(path, file, { contentType: file.type });
                if (upErr) { toast.error("تعذّر رفع الصورة"); setBusy(false); return; }
                imageUrl = supabase.storage.from("request-images").getPublicUrl(path).data.publicUrl;
              }
              const { error } = await supabase.rpc("ask_material", {
                p_name: String(f.get("name")), p_brand: String(f.get("brand") ?? ""),
                p_qty: Math.max(1, Math.floor(Number(f.get("qty")) || 1)),
                p_note: String(f.get("note") ?? ""), ...(imageUrl ? { p_image: imageUrl } : {}),
              });
              setBusy(false);
              if (error) { toast.error(errorText(error.message)); return; }
              toast.success("وصل طلبك، سنردّ عليك قريبًا");
              form.reset(); setOpen(false);
              qc.invalidateQueries({ queryKey: ["my-requests"] });
            }}
          >
            <input name="name" required minLength={2} maxLength={120} placeholder="اسم المادة" className={input} />
            <div className="grid grid-cols-2 gap-3">
              <input name="brand" maxLength={80} placeholder="الماركة (اختياري)" className={input} />
              <input name="qty" type="number" min={1} defaultValue={1} required placeholder="الكمية" className={input} dir="ltr" />
            </div>
            <textarea name="note" maxLength={500} rows={3} placeholder="ملاحظة (اختياري)" className={input} />
            <label className="block text-sm">صورة (اختياري)<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={input} /></label>
            <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">{busy ? "جارِ الإرسال…" : "إرسال"}</button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// طلبات الزبون وردود المدير (في صفحة الحساب)
export function MyRequests() {
  const { data = [] } = useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: products = [] } = useProducts();
  const { add } = useCart();
  if (data.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl font-black">طلبات التوفر</h2>
      <div className="mt-3 space-y-2">
        {data.map((r) => {
          const p = r.product_id ? products.find((x) => x.id === r.product_id && x.active) : undefined;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div><b>{r.name}</b>{r.brand && <span className="text-sm text-muted-foreground"> · {r.brand}</span>}<div className="text-xs text-muted-foreground">الكمية {r.qty} · {new Date(r.created_at).toLocaleDateString("ar")}</div></div>
                <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${r.status === "متوفرة" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{r.status}</span>
              </div>
              {r.reply_price != null && <div className="mt-2 text-sm">السعر: <b><Price usd={Number(r.reply_price)} /></b></div>}
              {r.reply_note && <p className="mt-1 text-sm text-muted-foreground">{r.reply_note}</p>}
              {p && !soldOut(p) && <button onClick={() => { add(p.id, r.qty); toast.success("أُضيف إلى السلة"); }} className="mt-2 rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">أضف للسلة</button>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
