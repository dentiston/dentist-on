import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { sb } from "@/lib/db";
import { fmt, imgSrc, useProducts, type Product } from "@/lib/products";
import { AUDIENCES, BUNDLE_CATEGORY, bundleValue, isBundle, type Audience, type BundleItem } from "@/lib/bundles";
import { genCode, normCode, refLink, refMessage } from "@/lib/referral";
import { inviteLink, portalMessage } from "@/lib/distributor";
import { waLinkTo } from "@/lib/store";
import { SERVICE_STATUSES } from "@/components/ServiceRequests";
import { defaultAbout, useAbout, type AboutConfig } from "@/lib/about";
import { useProducts as useProductsForReviews } from "@/lib/products";
import { Stars } from "@/components/ProductReviews";
import type { Review } from "@/lib/reviews";

const input = "w-full rounded-xl border border-input bg-card px-3 py-2";
const btn = "rounded-full px-4 py-1.5 text-sm font-bold";

type Dist = { id: string; name: string; phone: string; code: string; note: string; active: boolean; created_at: string; user_id?: string | null; portal_email?: string; invite_token?: string | null; invite_expires?: string | null };
export const useDistributors = (enabled = true) =>
  useQuery({
    queryKey: ["distributors"], enabled,
    queryFn: async () => {
      const { data, error } = await sb.from("distributors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Dist[];
    },
  });

// عدّادات التبويبات: أدوات مستعملة بانتظار الموافقة + طلبات إضافية/صيانة جديدة
export const useHubCounts = (enabled: boolean) =>
  useQuery({
    queryKey: ["hub-counts"], enabled, refetchInterval: 30_000,
    queryFn: async () => {
      const [u, s] = await Promise.all([
        sb.from("used_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
        sb.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "جديد"),
      ]);
      return { used: u.count ?? 0, services: s.count ?? 0 };
    },
  });

const useCustomerList = () =>
  useQuery({
    queryKey: ["hub-customers"],
    queryFn: async () => {
      const { data, error } = await sb.from("customers").select("user_id,clinic_name,phone,status,distributor_id");
      if (error) throw error;
      return (data ?? []) as { user_id: string; clinic_name: string; phone: string; status: string; distributor_id: string | null }[];
    },
  });
const custMap = (l: { user_id: string; clinic_name: string; phone: string }[]) => Object.fromEntries(l.map((c) => [c.user_id, c]));

// ---------- الموزعون ----------
export function DistributorsAdmin() {
  const qc = useQueryClient();
  const { data: list = [] } = useDistributors();
  const { data: custs = [] } = useCustomerList();
  const { data: orders = [] } = useQuery({
    queryKey: ["hub-orders"],
    queryFn: async () => {
      const { data, error } = await sb.from("orders").select("customer_id,total,status");
      if (error) throw error;
      return (data ?? []) as { customer_id: string | null; total: number; status: string }[];
    },
  });
  const [form, setForm] = useState({ name: "", phone: "", code: genCode() });
  const [open, setOpen] = useState<string | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["distributors"] }); qc.invalidateQueries({ queryKey: ["hub-customers"] }); };
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast.success("تم نسخ الرابط"); } catch { toast.error("تعذّر النسخ"); } };
  return (
    <section className="mt-6 space-y-5">
      <form className="grid gap-3 rounded-2xl bg-secondary p-4 sm:grid-cols-[1fr_1fr_140px_auto]" onSubmit={async (e) => {
        e.preventDefault();
        const code = normCode(form.code);
        if (!code) { toast.error("الكود غير صالح"); return; }
        const { error } = await sb.from("distributors").insert({ name: form.name.trim(), phone: form.phone.trim(), code });
        if (error) { toast.error(error.message.includes("duplicate") ? "هذا الكود مستخدم" : error.message); return; }
        toast.success("تمت إضافة الموزع"); setForm({ name: "", phone: "", code: genCode() }); refresh();
      }}>
        <input required placeholder="اسم الموزع" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        <input required placeholder="هاتف الموزع (واتساب)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} dir="ltr" />
        <input required placeholder="الكود" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={input} dir="ltr" />
        <button className="rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground"><Plus className="inline h-4 w-4" /> إضافة</button>
      </form>
      {list.length === 0 && <p className="py-8 text-center text-muted-foreground">لا يوجد موزعون بعد.</p>}
      {list.map((d) => {
        const docs = custs.filter((c) => c.distributor_id === d.id);
        const ids = new Set(docs.map((c) => c.user_id));
        const mine = orders.filter((o) => o.customer_id && ids.has(o.customer_id) && o.status !== "ملغي");
        const link = refLink(d.code);
        return (
          <div key={d.id} className={`rounded-2xl border bg-card p-4 ${d.active ? "border-border" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-black">{d.name} {!d.active && <span className="text-xs font-normal text-muted-foreground">(موقوف)</span>}</div>
                <div className="text-sm text-muted-foreground" dir="ltr">{d.phone}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                <b className="text-foreground">{docs.length}</b> طبيب · <b className="text-foreground">{mine.length}</b> طلب · <b className="text-foreground">{fmt(mine.reduce((s, o) => s + Number(o.total), 0))}</b>
              </div>
            </div>
            <div className="mt-2 break-all rounded-xl bg-muted px-3 py-2 text-xs" dir="ltr">{link}</div>
            <PortalLinker d={d} onDone={refresh} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => copy(link)} className={`${btn} bg-primary text-primary-foreground`}>نسخ الرابط</button>
              <a href={waLinkTo(d.phone, refMessage(d.name, link))} target="_blank" rel="noreferrer" className={`${btn} bg-accent text-accent-foreground`}>أرسل الرابط للموزع (واتساب)</a>
              <button onClick={() => setOpen(open === d.id ? null : d.id)} className={`${btn} bg-muted`}>الأطباء ({docs.length})</button>
              <button onClick={async () => { const { error } = await sb.from("distributors").update({ active: !d.active }).eq("id", d.id); if (error) toast.error(error.message); else refresh(); }} className={`${btn} bg-muted`}>{d.active ? "إيقاف الرابط" : "تفعيل"}</button>
              <button aria-label="تعديل" onClick={async () => {
                const name = prompt("اسم الموزع", d.name); if (name == null) return;
                const phone = prompt("هاتف الموزع", d.phone); if (phone == null) return;
                const { error } = await sb.from("distributors").update({ name: name.trim() || d.name, phone: phone.trim() }).eq("id", d.id);
                if (error) toast.error(error.message); else refresh();
              }}><Pencil className="h-4 w-4" /></button>
              <button aria-label="حذف" className="text-destructive" onClick={async () => {
                if (!confirm("حذف الموزع؟ سيبقى أطباؤه بلا موزع.")) return;
                const { error } = await sb.from("distributors").delete().eq("id", d.id);
                if (error) toast.error(error.message); else refresh();
              }}><Trash2 className="h-4 w-4" /></button>
            </div>
            {open === d.id && (
              <ul className="mt-3 space-y-1 text-sm">
                {docs.length === 0 && <li className="text-muted-foreground">لا يوجد أطباء بعد.</li>}
                {docs.map((c) => <li key={c.user_id} className="flex justify-between gap-2 rounded-lg bg-muted px-3 py-1.5"><span>{c.clinic_name}</span><span className="text-muted-foreground" dir="ltr">{c.phone}</span></li>)}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

// بوابة الموزع: لا يصير أحد موزعاً إلا برابط دعوة تولّده أنت هنا (لمرة واحدة، صالح 7 أيام)
function PortalLinker({ d, onDone }: { d: Dist; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const live = !!d.invite_token && !!d.invite_expires && new Date(d.invite_expires).getTime() > Date.now();
  const err = (m: string) => toast.error(m.includes("function") ? "نفّذ supabase-changes-5.sql أولاً" : m.includes("already_linked") ? "الموزع مربوط بحساب بالفعل" : m);
  const create = async () => {
    setBusy(true);
    const { error } = await sb.rpc("admin_create_distributor_invite", { p_dist: d.id });
    setBusy(false);
    if (error) { err(error.message); return; }
    toast.success("تم إنشاء رابط الدعوة"); onDone();
  };
  const unlink = async (msg: string) => {
    if (!confirm(msg)) return;
    setBusy(true);
    const { error } = await sb.rpc("admin_unlink_distributor", { p_dist: d.id });
    setBusy(false);
    if (error) { err(error.message); return; }
    toast.success("تم"); onDone();
  };
  const url = live ? inviteLink(d.invite_token!) : "";
  return (
    <div className="mt-3 rounded-xl border border-dashed border-border p-3 text-sm">
      <div className="font-bold">بوابة الموزع {d.user_id ? <span className="mr-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">مفعّلة ✓</span> : live ? <span className="mr-1 rounded-full bg-muted px-2 py-0.5 text-xs">بانتظار تفعيل الموزع</span> : <span className="mr-1 rounded-full bg-muted px-2 py-0.5 text-xs">لا دعوة</span>}</div>
      {d.user_id ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground" dir="ltr">{d.portal_email}</span>
          <button disabled={busy} onClick={() => void unlink("فصل حساب هذا الموزع؟ سيفقد الدخول للبوابة.")} className={`${btn} bg-muted`}>فصل الحساب</button>
        </div>
      ) : live ? (
        <div className="mt-2 space-y-2">
          <div className="break-all rounded-xl bg-muted px-3 py-2 text-xs" dir="ltr">{url}</div>
          <p className="text-xs text-muted-foreground">يعمل مرة واحدة فقط ويُغلق بعد التفعيل. ينتهي {new Date(d.invite_expires!).toLocaleDateString("ar")}.</p>
          <div className="flex flex-wrap gap-2">
            <a href={waLinkTo(d.phone, portalMessage(d.name, d.invite_token!))} target="_blank" rel="noreferrer" className={`${btn} bg-accent text-accent-foreground`}>أرسل الدعوة (واتساب)</a>
            <button onClick={() => { void navigator.clipboard.writeText(url).then(() => toast.success("تم نسخ الرابط")); }} className={`${btn} bg-muted`}>نسخ الرابط</button>
            <button disabled={busy} onClick={() => void create()} className={`${btn} bg-muted`}>رابط جديد</button>
            <button disabled={busy} onClick={() => void unlink("إلغاء هذه الدعوة؟")} className={`${btn} bg-muted`}>إلغاء الدعوة</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">لا يستطيع أحد إنشاء حساب موزع بنفسه. أنشئ رابط دعوة وأرسله للموزع ليفتح حسابه.</p>
          <button disabled={busy || !d.active} onClick={() => void create()} className={`${btn} bg-primary text-primary-foreground disabled:opacity-50`}>إنشاء رابط دعوة</button>
        </div>
      )}
    </div>
  );
}

// اختيار موزع لطبيب (يُستخدم في تبويب العملاء)
export function CustomerDistributor({ userId, current }: { userId: string; current: string | null | undefined }) {
  const qc = useQueryClient();
  const { data: list = [] } = useDistributors();
  if (list.length === 0 && !current) return null;
  return (
    <label className="flex items-center gap-2 text-sm">الموزع
      <select value={current ?? ""} className="rounded-lg border border-input bg-card px-2 py-1" onChange={async (e) => {
        const { error } = await sb.rpc("admin_set_distributor", { p_user: userId, p_dist: e.target.value || null });
        if (error) toast.error("تعذر الحفظ"); else { toast.success("تم تحديث الموزع"); qc.invalidateQueries({ queryKey: ["customers"] }); qc.invalidateQueries({ queryKey: ["hub-customers"] }); }
      }}>
        <option value="">— بلا موزع —</option>
        {list.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
    </label>
  );
}

// ---------- العروض والبكجات ----------
type BForm = { id: string; name: string; price: string; audience: Audience; image: string; note: string; active: boolean; items: BundleItem[] };
const emptyB = (): BForm => ({ id: "", name: "", price: "", audience: "students", image: "", note: "", active: true, items: [] });

export function BundlesAdmin() {
  const qc = useQueryClient();
  const { data: products = [] } = useProducts();
  const bundles = products.filter(isBundle);
  const singles = products.filter((p) => !isBundle(p));
  const [f, setF] = useState<BForm | null>(null);
  const [pick, setPick] = useState(""); const [qty, setQty] = useState(1);
  const refresh = () => qc.invalidateQueries({ queryKey: ["products"] });
  const edit = (p: Product) => setF({ id: p.id, name: p.name, price: String(p.price), audience: (p.audience as Audience) ?? "all", image: p.image, note: "", active: p.active, items: p.bundle_items ?? [] });
  const value = f ? f.items.reduce((s, it) => s + Number(products.find((p) => p.id === it.id)?.price ?? 0) * it.qty, 0) : 0;
  return (
    <section className="mt-6">
      <button onClick={() => setF(emptyB())} className="mb-4 flex items-center gap-2 rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground"><Plus className="h-4 w-4" /> باقة جديدة</button>
      {f && (
        <form className="mb-6 grid gap-3 rounded-2xl bg-secondary p-4 sm:grid-cols-2" onSubmit={async (e) => {
          e.preventDefault();
          if (f.items.length === 0) { toast.error("أضف منتجاً واحداً على الأقل إلى الباقة"); return; }
          const lines = f.items.map((it) => `• ${products.find((p) => p.id === it.id)?.name ?? it.id} × ${it.qty}`).join("\n");
          const price = Number(f.price);
          const row = {
            id: f.id || `bundle-${crypto.randomUUID().slice(0, 8)}`, name: f.name.trim(), brand: "باقة", category: BUNDLE_CATEGORY,
            price, bulk_price: price, image: f.image || "instruments", images: [] as string[], active: f.active,
            description: `${f.note ? `${f.note}\n\n` : ""}محتويات الباقة:\n${lines}`, bundle_items: f.items, audience: f.audience, stock: null,
          };
          const { error } = f.id ? await sb.from("products").update(row).eq("id", f.id) : await sb.from("products").insert(row);
          if (error) { toast.error(error.message); return; }
          toast.success("تم حفظ الباقة"); setF(null); refresh();
        }}>
          <input required placeholder="اسم الباقة (مثال: باقة طالب السنة الرابعة)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} />
          <select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value as Audience })} className={input}>
            {(Object.keys(AUDIENCES) as Audience[]).map((k) => <option key={k} value={k}>{AUDIENCES[k]}</option>)}
          </select>
          <label className="text-sm">سعر الباقة $<input required type="number" step="0.01" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={input} dir="ltr" /></label>
          <label className="text-sm">رفع صورة<input type="file" accept="image/*" className={input} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const path = `${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
            const { error } = await sb.storage.from("product-images").upload(path, file, { contentType: file.type });
            if (error) { toast.error(error.message); return; }
            setF({ ...f, image: sb.storage.from("product-images").getPublicUrl(path).data.publicUrl }); toast.success("تم رفع الصورة");
          }} /></label>
          <input placeholder="رابط الصورة (اختياري)" value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} className={`${input} sm:col-span-2`} dir="ltr" />
          <textarea placeholder="وصف قصير (اختياري)، تُضاف المحتويات تلقائياً" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} rows={2} className={`${input} sm:col-span-2`} />
          <div className="sm:col-span-2">
            <div className="text-sm font-bold">محتويات الباقة</div>
            <div className="mt-2 flex gap-2">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className={input}>
                <option value="">— اختر منتجاً —</option>
                {singles.map((p) => <option key={p.id} value={p.id}>{p.name} ({fmt(p.price)})</option>)}
              </select>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-20 rounded-xl border border-input bg-card px-2" dir="ltr" />
              <button type="button" className="shrink-0 rounded-xl bg-primary px-4 font-bold text-primary-foreground" onClick={() => {
                if (!pick) return;
                const ex = f.items.find((x) => x.id === pick);
                setF({ ...f, items: ex ? f.items.map((x) => x.id === pick ? { ...x, qty: x.qty + qty } : x) : [...f.items, { id: pick, qty }] });
                setPick(""); setQty(1);
              }}>أضف</button>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {f.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between rounded-lg bg-card px-3 py-1.5">
                  <span>{products.find((p) => p.id === it.id)?.name ?? it.id} × {it.qty}</span>
                  <button type="button" aria-label="إزالة" className="text-destructive" onClick={() => setF({ ...f, items: f.items.filter((x) => x.id !== it.id) })}>×</button>
                </li>
              ))}
            </ul>
            {f.items.length > 0 && <p className="mt-2 text-sm text-muted-foreground">مجموع القطع منفردة: <b>{fmt(value)}</b>{Number(f.price) > 0 && value > Number(f.price) && <> · التوفير: <b>{fmt(value - Number(f.price))}</b></>}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> ظاهرة للزبائن</label>
          <div className="flex gap-2 sm:justify-end">
            <button type="button" onClick={() => setF(null)} className="rounded-full bg-muted px-5 py-2">إلغاء</button>
            <button className="rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground">حفظ</button>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">ملاحظة: الباقة تُباع كمنتج واحد، ولا يُخصم مخزون مكوّناتها تلقائياً؛ حدّث مخزون المكوّنات يدوياً عند التجهيز.</p>
        </form>
      )}
      {bundles.length === 0 && !f && <p className="py-8 text-center text-muted-foreground">لا توجد باقات بعد.</p>}
      <div className="space-y-2">
        {bundles.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <img src={imgSrc(b.image)} alt="" className="h-14 w-14 rounded-xl object-cover" />
            <div className="flex-1">
              <div className="font-bold">{b.name} {!b.active && <span className="text-xs text-muted-foreground">(مخفية)</span>}</div>
              <div className="text-sm text-muted-foreground">{AUDIENCES[(b.audience as Audience) ?? "all"] ?? "للجميع"} · {fmt(b.price)} · قيمة المكوّنات {fmt(bundleValue(b, products))}</div>
            </div>
            <button aria-label="تعديل" onClick={() => { edit(b); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="h-4 w-4" /></button>
            <button aria-label="حذف" className="text-destructive" onClick={async () => {
              if (!confirm("حذف الباقة؟")) return;
              const { error } = await sb.from("products").delete().eq("id", b.id);
              if (error) toast.error(error.message); else refresh();
            }}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- الأدوات المستعملة: مراجعة ----------
type UItem = { id: string; user_id: string; title: string; description: string; category: string; condition: string; price: number | null; image_urls: string[]; status: string; admin_note: string; created_at: string };
const U_LABEL: Record<string, string> = { pending: "بانتظار الموافقة", approved: "معروضة", rejected: "مرفوضة", sold: "مباعة" };

export function UsedItemsAdmin() {
  const qc = useQueryClient();
  const { data: custs = [] } = useCustomerList();
  const cm = custMap(custs);
  const { data = [] } = useQuery({
    queryKey: ["admin-used"], refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await sb.from("used_items").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as UItem[];
    },
  });
  const sorted = [...data].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-used"] }); qc.invalidateQueries({ queryKey: ["hub-counts"] }); qc.invalidateQueries({ queryKey: ["used-items"] }); };
  const decide = async (i: UItem, status: "approved" | "rejected" | "sold") => {
    const note = status === "rejected" ? (prompt("سبب الرفض (يظهر للطبيب)", "") ?? "") : i.admin_note;
    const { error } = await sb.from("used_items").update({ status, admin_note: note, decided_at: new Date().toISOString() }).eq("id", i.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم التحديث"); refresh();
    const c = cm[i.user_id];
    if (c?.phone && status !== "sold") toast.info("أبلغ الطبيب؟", { duration: 12000, action: { label: "واتساب", onClick: () => window.open(waLinkTo(c.phone, status === "approved" ? `مرحباً ${c.clinic_name}، تمت الموافقة على عرض "${i.title}" وهو الآن ظاهر للأطباء في قسم الأدوات المستعملة.` : `مرحباً ${c.clinic_name}، نعتذر، لم نتمكن من اعتماد عرض "${i.title}".${note ? `\nالسبب: ${note}` : ""}`), "_blank") } });
  };
  return (
    <section className="mt-6 space-y-3">
      {sorted.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد عروض.</p>}
      {sorted.map((i) => {
        const c = cm[i.user_id];
        return (
          <div key={i.id} className={`rounded-2xl border bg-card p-4 ${i.status === "pending" ? "border-accent" : "border-border"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-black">{i.title} <span className="text-sm font-normal text-muted-foreground">· {i.condition}{i.category && ` · ${i.category}`}</span></div>
                <div className="text-sm text-muted-foreground">{c?.clinic_name ?? "—"} · <span dir="ltr">{c?.phone}</span> · {i.price == null ? "على السوم" : fmt(Number(i.price))}</div>
                {i.description && <p className="mt-1 text-sm">{i.description}</p>}
                <div className="mt-2 flex flex-wrap gap-2">{i.image_urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-16 w-16 rounded-xl object-cover" /></a>)}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${i.status === "pending" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{U_LABEL[i.status] ?? i.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {i.status !== "approved" && i.status !== "sold" && <button onClick={() => decide(i, "approved")} className={`${btn} bg-primary text-primary-foreground`}>موافقة وعرض</button>}
              {i.status !== "rejected" && i.status !== "sold" && <button onClick={() => decide(i, "rejected")} className={`${btn} bg-muted`}>رفض</button>}
              {i.status === "approved" && <button onClick={() => decide(i, "sold")} className={`${btn} bg-muted`}>تم البيع</button>}
              {c?.phone && <a href={waLinkTo(c.phone, `مرحباً ${c.clinic_name}، بخصوص عرضك "${i.title}".`)} target="_blank" rel="noreferrer" className={`${btn} bg-accent text-accent-foreground`}>واتساب</a>}
              <button className="text-destructive" aria-label="حذف" onClick={async () => { if (!confirm("حذف العرض؟")) return; const { error } = await sb.from("used_items").delete().eq("id", i.id); if (error) toast.error(error.message); else refresh(); }}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ---------- الطلبات الإضافية + الصيانة ----------
type SRow = { id: string; user_id: string; kind: "outside" | "maintenance"; title: string; qty: number; buy_from: string; note: string; urgent: boolean; image_url: string | null; status: string; reply_price: number | null; reply_note: string; created_at: string };

export function ServiceRequestsAdmin() {
  const [kind, setKind] = useState<"all" | "outside" | "maintenance">("all");
  const { data: custs = [] } = useCustomerList();
  const cm = custMap(custs);
  const { data = [] } = useQuery({
    queryKey: ["admin-services"], refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await sb.from("service_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as SRow[];
    },
  });
  const list = data.filter((r) => kind === "all" || r.kind === kind);
  const chip = (k: typeof kind, l: string) => <button key={k} onClick={() => setKind(k)} className={`${btn} ${kind === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{l}</button>;
  return (
    <section className="mt-6">
      <div className="flex gap-2">{chip("all", "الكل")}{chip("outside", "مستلزمات خارجية")}{chip("maintenance", "صيانة")}</div>
      {list.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد طلبات.</p>}
      <div className="mt-4 space-y-3">{list.map((r) => <ServiceCard key={`${r.id}-${r.status}-${r.reply_price}`} r={r} {...(cm[r.user_id] ? { cust: cm[r.user_id] } : {})} />)}</div>
    </section>
  );
}

function ServiceCard({ r, cust }: { r: SRow; cust?: { clinic_name: string; phone: string } }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(r.status);
  const [price, setPrice] = useState(r.reply_price == null ? "" : String(r.reply_price));
  const [note, setNote] = useState(r.reply_note);
  const [busy, setBusy] = useState(false);
  const m = r.kind === "maintenance";
  const msg = `مرحباً ${cust?.clinic_name ?? ""}، بخصوص ${m ? "طلب الصيانة" : "طلبك"} "${r.title}": ${status}${price ? `\n${m ? "التكلفة" : "السعر"}: ${fmt(Number(price))}` : ""}${note ? `\n${note}` : ""}`;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-services"] }); qc.invalidateQueries({ queryKey: ["hub-counts"] }); };
  return (
    <div className={`rounded-2xl border bg-card p-4 ${r.status === "جديد" ? "border-accent" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-black">
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${m ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m ? "صيانة" : "خارجي"}</span>
            {r.title}{!m && <span className="text-sm font-normal text-muted-foreground"> × {r.qty}</span>}{r.urgent && <b className="mr-2 text-destructive">مستعجل</b>}
          </div>
          <div className="text-sm text-muted-foreground">{cust?.clinic_name ?? "—"} · <span dir="ltr">{cust?.phone}</span> · {new Date(r.created_at).toLocaleDateString("ar")}</div>
          {r.buy_from && <div className="text-sm">مكان الشراء المقترح: <b>{r.buy_from}</b></div>}
          {r.note && <p className="mt-1 text-sm">{r.note}</p>}
        </div>
        {r.image_url && <a href={r.image_url} target="_blank" rel="noreferrer"><img src={r.image_url} alt="" className="h-16 w-16 rounded-xl object-cover" /></a>}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>{SERVICE_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={m ? "التكلفة $" : "السعر $"} className={input} dir="ltr" />
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="ملاحظة للطبيب" className={input} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} className={`${btn} bg-primary text-primary-foreground disabled:opacity-60`} onClick={async () => {
          setBusy(true);
          const { error } = await sb.from("service_requests").update({ status, reply_price: price === "" ? null : Number(price), reply_note: note, replied_at: new Date().toISOString() }).eq("id", r.id);
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          toast.success("تم الحفظ"); refresh();
        }}>حفظ الردّ</button>
        {cust?.phone && <a href={waLinkTo(cust.phone, msg)} target="_blank" rel="noreferrer" className={`${btn} bg-accent text-accent-foreground`}>واتساب</a>}
        <button className="text-destructive" aria-label="حذف" onClick={async () => { if (!confirm("حذف هذا الطلب؟")) return; const { error } = await sb.from("service_requests").delete().eq("id", r.id); if (error) toast.error(error.message); else refresh(); }}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

// ---------- من نحن والتوصيل (يظهر في /about) ----------
export function AboutEditor() {
  const qc = useQueryClient();
  const { data } = useAbout();
  const [f, setF] = useState<AboutConfig | null>(null);
  const v = f ?? data ?? defaultAbout;
  const set = (k: keyof AboutConfig, x: string) => setF({ ...v, [k]: x });
  return (
    <section className="mt-8 max-w-md">
      <div className="rounded-2xl bg-secondary p-5">
        <div className="font-bold">صفحة «من نحن والتوصيل»</div>
        <p className="mt-1 text-xs text-muted-foreground">المناطق والرسوم والحد الأدنى تُؤخذ من «قواعد الطلب». الحقول الفارغة لا تظهر للزبائن.</p>
        <form className="mt-3 space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await sb.from("shop_config").upsert({ key: "about", value: v });
          if (error) { toast.error(error.message); return; }
          toast.success("تم الحفظ"); setF(null); qc.invalidateQueries({ queryKey: ["shop_about"] });
        }}>
          <label className="block text-sm">نبذة عن المتجر<textarea rows={3} value={v.intro} onChange={(e) => set("intro", e.target.value)} className={input} /></label>
          <label className="block text-sm">مدة التوصيل (مثال: خلال 24–48 ساعة)<input value={v.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} className={input} /></label>
          <label className="block text-sm">ملاحظات التوصيل<textarea rows={2} value={v.deliveryNote} onChange={(e) => set("deliveryNote", e.target.value)} className={input} /></label>
          <label className="block text-sm">ساعات العمل<input value={v.hours} onChange={(e) => set("hours", e.target.value)} className={input} /></label>
          <label className="block text-sm">العنوان<input value={v.address} onChange={(e) => set("address", e.target.value)} className={input} /></label>
          <button className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">حفظ</button>
        </form>
      </div>
    </section>
  );
}

// ---------- مراجعة التقييمات ----------
export function ReviewsAdmin() {
  const qc = useQueryClient();
  const { data: products = [] } = useProductsForReviews();
  const { data = [] } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await sb.from("product_reviews").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); qc.invalidateQueries({ queryKey: ["review_stats"] }); qc.invalidateQueries({ queryKey: ["reviews"] }); };
  return (
    <section className="mt-6 space-y-3">
      {data.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد تقييمات.</p>}
      {data.map((r) => (
        <div key={r.id} className={`rounded-2xl border border-border bg-card p-4 ${r.hidden ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><b>{r.author || "—"}</b> <span className="text-sm text-muted-foreground">على {products.find((p) => p.id === r.product_id)?.name ?? r.product_id}</span></div>
            <Stars value={r.rating} />
          </div>
          {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="text-xs text-muted-foreground">{r.verified ? "مشترٍ للمنتج · " : ""}{new Date(r.created_at).toLocaleDateString("ar")}</span>
            <button className="font-bold underline" onClick={async () => { const { error } = await sb.from("product_reviews").update({ hidden: !r.hidden }).eq("id", r.id); if (error) toast.error(error.message); else refresh(); }}>{r.hidden ? "إظهار" : "إخفاء"}</button>
            <button className="text-destructive" aria-label="حذف" onClick={async () => { if (!confirm("حذف التقييم؟")) return; const { error } = await sb.from("product_reviews").delete().eq("id", r.id); if (error) toast.error(error.message); else refresh(); }}><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </section>
  );
}
