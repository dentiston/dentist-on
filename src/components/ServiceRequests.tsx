import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackagePlus, Wrench, MessageCircle } from "lucide-react";
import { sb, uploadUserImage } from "@/lib/db";
import { useCustomer } from "@/lib/customer";
import { ordersLink } from "@/lib/contacts";
import { Price } from "@/components/Price";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const input = "w-full rounded-xl border border-input bg-card px-3 py-2";
export type Kind = "outside" | "maintenance";
export const SERVICE_STATUSES = ["جديد", "قيد المراجعة", "تم التسعير", "قيد التنفيذ", "مكتمل", "ملغي"] as const;

type Row = {
  id: string; user_id: string; kind: Kind; title: string; qty: number; buy_from: string; note: string; urgent: boolean;
  image_url: string | null; status: string; reply_price: number | null; reply_note: string; created_at: string;
};

const errorText = (m: string) =>
  m.includes("too many open") ? "لديك طلبات مفتوحة كثيرة، انتظر الردّ على بعضها"
  : m.includes("slow down") ? "انتظر لحظات قبل إرسال طلب آخر"
  : m.includes("not approved") ? "حسابك بانتظار الموافقة"
  : "تعذّر إرسال الطلب، تأكد من البيانات";

export const useMyServiceRequests = (enabled: boolean) =>
  useQuery({
    queryKey: ["my-service-requests"],
    enabled,
    queryFn: async () => {
      const { data, error } = await sb.from("service_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

// نموذج الطلب (يُستخدم في السلة وفي نافذة اللوحة الجانبية)
export function RequestForm({ kind, onDone }: { kind: Kind; onDone?: () => void }) {
  const { session, customer } = useCustomer();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const m = kind === "maintenance";
  if (!session || customer?.status !== "approved") {
    return (
      <div className="rounded-xl bg-card p-3 text-sm">
        {!session
          ? <>لإرسال الطلب من الموقع سجّل حساب عيادتك. <Link to="/account" className="font-bold text-primary underline">تسجيل / دخول</Link></>
          : "حسابك قيد المراجعة؛ سيُفتح الطلب بعد الموافقة."}
        <a href={ordersLink(m ? "طلب صيانة" : "طلب مواد من خارج المتجر", customer?.clinic_name)} target="_blank" rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 font-bold text-black">
          <MessageCircle className="h-4 w-4" /> أرسل طلبك عبر واتساب مباشرة
        </a>
      </div>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        let image: string | null = null;
        try { image = await uploadUserImage(session.user.id, f.get("image") as File); }
        catch (x) { toast.error((x as Error).message === "size" ? "حجم الصورة أكبر من 3MB" : "تعذّر رفع الصورة"); setBusy(false); return; }
        const { error } = await sb.rpc("submit_service_request", {
          p_kind: kind, p_title: String(f.get("title")), p_qty: m ? 1 : Math.max(1, Math.floor(Number(f.get("qty")) || 1)),
          p_buy_from: String(f.get("buy_from") ?? ""), p_note: String(f.get("note") ?? ""),
          p_urgent: f.get("urgent") === "on", p_image: image ?? "",
        });
        setBusy(false);
        if (error) { toast.error(errorText(error.message)); return; }
        toast.success(m ? "وصل طلب الصيانة، سنتواصل معك قريباً" : "وصل طلبك، سنردّ عليك بالسعر والتوصيل");
        form.reset();
        qc.invalidateQueries({ queryKey: ["my-service-requests"] });
        onDone?.();
      }}
    >
      <input name="title" required minLength={2} maxLength={120} className={input}
        placeholder={m ? "الجهاز / القطعة (مثال: قبضة توربين، أوتوكلاف، كرسي أسنان)" : "اسم المادة أو المستلزم المطلوب"} />
      {m ? (
        <textarea name="note" required maxLength={800} rows={3} className={input} placeholder="وصف العطل أو المطلوب (متى بدأ، ماذا يحدث…)" />
      ) : (
        <>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <input name="qty" type="number" min={1} defaultValue={1} required className={input} dir="ltr" aria-label="الكمية" />
            <input name="buy_from" maxLength={200} className={input} placeholder="مكان الشراء المفضّل (اختياري)" />
          </div>
          <textarea name="note" maxLength={800} rows={2} className={input} placeholder="ملاحظات: الماركة، المقاس، رابط… (اختياري)" />
        </>
      )}
      <label className="block text-sm">صورة (اختياري)<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={input} /></label>
      {m && <label className="flex items-center gap-2 text-sm font-bold"><input name="urgent" type="checkbox" /> مستعجل</label>}
      <p className="text-xs text-muted-foreground">
        {m ? "يُرسَل الطلب لفريق الصيانة، ويتواصل معك على رقم هاتفك المسجّل." : "نشتريها لك من خارج المتجر ونوصلها إليك. يردّ المدير بالسعر ومدة التوصيل."}
      </p>
      <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">{busy ? "جارِ الإرسال…" : "إرسال الطلب"}</button>
    </form>
  );
}

// نافذة منبثقة (من اللوحة الجانبية)
export function ServiceRequestDialog({ kind, open, onOpenChange }: { kind: Kind; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{kind === "maintenance" ? "طلب صيانة" : "طلب مستلزمات من خارج المتجر"}</DialogTitle>
          <DialogDescription>{kind === "maintenance" ? "صيانة الأجهزة والقبضات والمعدات." : "اطلب أي مادة غير موجودة في المتجر ونوصلها لك."}</DialogDescription>
        </DialogHeader>
        <RequestForm kind={kind} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function MyServiceRequests() {
  const { session, customer } = useCustomer();
  const qc = useQueryClient();
  const { data = [] } = useMyServiceRequests(!!session && customer?.status === "approved");
  if (data.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="font-black">طلباتي الإضافية</h3>
      <div className="mt-2 space-y-2">
        {data.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <b>{r.title}</b>
                <span className="text-sm text-muted-foreground"> · {r.kind === "maintenance" ? "صيانة" : `× ${r.qty}`}{r.urgent && " · مستعجل"}</span>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar")}{r.buy_from && ` · من: ${r.buy_from}`}</div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ${r.status === "تم التسعير" || r.status === "مكتمل" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{r.status}</span>
            </div>
            {r.reply_price != null && <div className="mt-2 text-sm">{r.kind === "maintenance" ? "التكلفة" : "السعر"}: <b><Price usd={Number(r.reply_price)} /></b></div>}
            {r.reply_note && <p className="mt-1 text-sm text-muted-foreground">{r.reply_note}</p>}
            {r.status === "جديد" && (
              <button onClick={async () => {
                if (!confirm("إلغاء هذا الطلب؟")) return;
                const { error } = await sb.from("service_requests").delete().eq("id", r.id);
                if (error) toast.error("تعذّر الإلغاء"); else qc.invalidateQueries({ queryKey: ["my-service-requests"] });
              }} className="mt-2 text-xs text-destructive underline">إلغاء الطلب</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// قسم «طلبات إضافية» داخل صفحة السلة: مستلزمات من خارج المتجر + الصيانة
export function ExtraRequestsSection() {
  const [kind, setKind] = useState<Kind>("outside");
  useEffect(() => {
    if (window.location.hash === "#extras") setTimeout(() => document.getElementById("extras")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }, []);
  const tab = (k: Kind, label: string, Icon: typeof Wrench) => (
    <button type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${kind === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
  return (
    <section id="extras" className="mt-12 scroll-mt-28 rounded-3xl border border-border bg-card p-5">
      <h2 className="text-2xl font-black">طلبات إضافية</h2>
      <p className="mt-1 text-sm text-muted-foreground">تحتاج شيئاً غير موجود في المتجر؟ اطلبه من أي مكان ونوصله لك، أو اطلب صيانة لأجهزتك.</p>
      <div className="mt-4 flex gap-2">{tab("outside", "مستلزمات من خارج المتجر", PackagePlus)}{tab("maintenance", "طلب صيانة", Wrench)}</div>
      <div className="mt-4 max-w-xl"><RequestForm key={kind} kind={kind} /></div>
      <MyServiceRequests />
    </section>
  );
}
