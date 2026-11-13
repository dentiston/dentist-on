import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { sb, uploadUserImage } from "@/lib/db";
import { useCustomer } from "@/lib/customer";
import { categories } from "@/lib/products";
import { ordersLink } from "@/lib/contacts";
import { Price } from "@/components/Price";
import { LogoLoader } from "@/components/LogoLoader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/used")({
  head: () => ({
    meta: [
      { title: "الأدوات المستعملة | Dentist On" },
      { name: "description", content: "أدوات ومعدات سنية مستعملة يعرضها أطباء معتمدون بعد مراجعة الإدارة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsedPage,
});

const input = "w-full rounded-xl border border-input bg-card px-3 py-2";
type Item = {
  id: string; user_id: string; title: string; description: string; category: string; condition: string;
  price: number | null; image_urls: string[]; status: string; admin_note: string; created_at: string;
};
const STATUS: Record<string, string> = { pending: "بانتظار موافقة المدير", approved: "معروضة", rejected: "مرفوضة", sold: "مباعة" };

function UsedPage() {
  const { session, customer, loading } = useCustomer();
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [open, setOpen] = useState(false);
  if (loading) return <main><LogoLoader /></main>;
  const ok = !!session && customer?.status === "approved";
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">الأدوات المستعملة</h1>
          <p className="mt-1 text-sm text-muted-foreground">أدوات يعرضها أطباء معتمدون. لا يظهر أي عرض إلا بعد موافقة الإدارة، والتواصل يتم عبرنا.</p>
        </div>
        {ok && <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground"><Plus className="h-4 w-4" /> اعرض أداة</button>}
      </div>
      {!ok ? (
        <p className="mt-8 rounded-2xl bg-secondary p-5">
          {!session ? <>هذا القسم للأطباء المعتمدين. <Link to="/account" className="font-bold text-primary underline">سجّل أو ادخل إلى حسابك</Link></>
            : "حسابك قيد المراجعة؛ يُفتح هذا القسم بعد الموافقة."}
        </p>
      ) : (
        <>
          <div className="mt-6 flex gap-2">
            {(["browse", "mine"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-2 font-bold ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{t === "browse" ? "المعروض" : "أدواتي"}</button>
            ))}
          </div>
          {tab === "browse" ? <Browse uid={session!.user.id} who={customer?.clinic_name} /> : <Mine />}
          <AddDialog open={open} onOpenChange={setOpen} uid={session!.user.id} onDone={() => { setTab("mine"); }} />
        </>
      )}
    </main>
  );
}

const useItems = (mine: boolean, uid?: string) =>
  useQuery({
    queryKey: ["used-items", mine ? "mine" : "all"],
    queryFn: async () => {
      let q = sb.from("used_items").select("*").order("created_at", { ascending: false });
      q = mine ? q.eq("user_id", uid!) : q.eq("status", "approved");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

function Browse({ uid, who }: { uid: string; who?: string | undefined }) {
  const { data = [], isLoading } = useItems(false);
  const [q, setQ] = useState("");
  const n = q.trim().toLowerCase();
  const list = data.filter((i) => !n || [i.title, i.description, i.category].some((t) => t.toLowerCase().includes(n)));
  return (
    <section className="mt-5">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في الأدوات المستعملة…" className={input} />
      {isLoading && <p className="mt-6 text-muted-foreground">جارِ التحميل…</p>}
      {!isLoading && list.length === 0 && <p className="py-14 text-center text-muted-foreground">لا توجد أدوات معروضة حالياً.</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((i) => (
          <article key={i.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            {i.image_urls[0] && <img src={i.image_urls[0]} alt={i.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
            <div className="flex flex-1 flex-col gap-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-black leading-snug">{i.title}</h2>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{i.condition}</span>
              </div>
              {i.category && <span className="text-xs text-muted-foreground">{i.category}</span>}
              {i.description && <p className="line-clamp-3 text-sm text-muted-foreground">{i.description}</p>}
              {i.image_urls.length > 1 && <div className="mt-1 flex gap-1">{i.image_urls.slice(1).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-10 w-10 rounded-lg object-cover" /></a>)}</div>}
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <b>{i.price == null ? "على السوم" : <Price usd={Number(i.price)} />}</b>
                {i.user_id === uid
                  ? <span className="text-xs text-muted-foreground">أداتك</span>
                  : <a href={ordersLink(`الاستفسار عن أداة مستعملة: ${i.title} (رمز ${i.id.slice(0, 8).toUpperCase()})`, who)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 rounded-full bg-[#25D366] px-4 py-1.5 text-sm font-bold text-black"><MessageCircle className="h-4 w-4" /> أنا مهتم</a>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Mine() {
  const { session } = useCustomer();
  const qc = useQueryClient();
  const { data = [], isLoading } = useItems(true, session?.user.id);
  const refresh = () => qc.invalidateQueries({ queryKey: ["used-items"] });
  return (
    <section className="mt-5 space-y-3">
      {isLoading && <p className="text-muted-foreground">جارِ التحميل…</p>}
      {!isLoading && data.length === 0 && <p className="py-14 text-center text-muted-foreground">لم تعرض أي أداة بعد.</p>}
      {data.map((i) => (
        <div key={i.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
          {i.image_urls[0] ? <img src={i.image_urls[0]} alt="" className="h-20 w-20 rounded-xl object-cover" /> : <div className="h-20 w-20 rounded-xl bg-muted" />}
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b>{i.title}</b>
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${i.status === "approved" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{STATUS[i.status] ?? i.status}</span>
            </div>
            <div className="text-sm text-muted-foreground">{i.price == null ? "على السوم" : `$${Number(i.price).toFixed(2)}`} · {i.condition}</div>
            {i.status === "rejected" && i.admin_note && <p className="mt-1 text-sm text-destructive">{i.admin_note}</p>}
            <div className="mt-2 flex gap-3 text-sm">
              {i.status === "approved" && <button className="font-bold underline" onClick={async () => { const { error } = await sb.rpc("mark_used_sold", { p_id: i.id }); if (error) toast.error("تعذّر التحديث"); else refresh(); }}>تم البيع</button>}
              <button className="text-destructive" aria-label="حذف" onClick={async () => { if (!confirm("حذف هذا العرض؟")) return; const { error } = await sb.from("used_items").delete().eq("id", i.id); if (error) toast.error("تعذّر الحذف"); else refresh(); }}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function AddDialog({ open, onOpenChange, uid, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; uid: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>اعرض أداة مستعملة</DialogTitle>
          <DialogDescription>سيراجع المدير العرض، ويظهر للأطباء بعد موافقته.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget; const f = new FormData(form);
          const files = (f.getAll("images") as File[]).filter((x) => x.size > 0).slice(0, 4);
          setBusy(true);
          try {
            const urls: string[] = [];
            for (const file of files) { const u = await uploadUserImage(uid, file); if (u) urls.push(u); }
            const price = String(f.get("price") ?? "").trim();
            const { error } = await sb.rpc("submit_used_item", {
              p_title: String(f.get("title")), p_description: String(f.get("description") ?? ""), p_category: String(f.get("category") ?? ""),
              p_condition: String(f.get("condition")), p_price: price === "" ? null : Number(price), p_images: urls,
            });
            if (error) throw new Error(error.message);
            toast.success("وصل عرضك، سيظهر بعد موافقة المدير");
            form.reset(); onOpenChange(false); onDone(); qc.invalidateQueries({ queryKey: ["used-items"] });
          } catch (x) {
            const m = (x as Error).message;
            toast.error(m === "size" ? "حجم إحدى الصور أكبر من 3MB" : m === "upload" ? "تعذّر رفع الصور" : m.includes("too many open") ? "لديك عروض كثيرة مفتوحة" : m.includes("slow down") ? "انتظر لحظات" : "تعذّر الإرسال، تأكد من البيانات");
          }
          setBusy(false);
        }}>
          <input name="title" required minLength={2} maxLength={120} placeholder="اسم الأداة (مثال: قبضة توربين NSK)" className={input} />
          <div className="grid grid-cols-2 gap-3">
            <input name="category" list="used-cats" placeholder="التصنيف" className={input} />
            <datalist id="used-cats">{categories.slice(1).map((c) => <option key={c} value={c} />)}</datalist>
            <select name="condition" defaultValue="جيدة" className={input}><option>ممتازة</option><option>جيدة</option><option>مقبولة</option></select>
          </div>
          <input name="price" type="number" min={0} step="0.01" placeholder="السعر بالدولار (اتركه فارغاً = على السوم)" className={input} dir="ltr" />
          <textarea name="description" rows={3} maxLength={1000} placeholder="الوصف: مدة الاستخدام، العيوب إن وجدت…" className={input} />
          <label className="block text-sm">صور (حتى 4)<input name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" className={input} /></label>
          <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">{busy ? "جارِ الإرسال…" : "إرسال للمراجعة"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
