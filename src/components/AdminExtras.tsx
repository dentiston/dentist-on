import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmt, useProducts, imgSrc } from "@/lib/products";
import { REQUEST_STATUSES } from "@/lib/extras";
import { absUrl, waLinkTo } from "@/lib/store";
import { createStaff, removeStaff, updateStaff } from "@/lib/staff.functions";

const input = "w-full rounded-xl border border-input bg-card px-3 py-2";

// عدّاد «جديد» لتبويب طلبات التوفر
export const useNewRequests = (enabled: boolean) =>
  useQuery({
    queryKey: ["req-new-count"],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase.from("material_requests").select("id", { count: "exact", head: true }).eq("status", "جديد");
      if (error) throw error;
      return count ?? 0;
    },
  });

const useCustomerMap = () =>
  useQuery({
    queryKey: ["admin-customer-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("user_id,clinic_name,phone");
      if (error) throw error;
      return Object.fromEntries(data.map((c) => [c.user_id, c]));
    },
  });

// ---------- طلبات التوفر + المنتظرون ----------
export function MaterialRequests() {
  return (
    <section className="mt-6 space-y-8">
      <Watchers />
      <Requests />
    </section>
  );
}

function Requests() {
  const { data = [] } = useQuery({
    queryKey: ["admin-requests"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("material_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const { data: custs = {} } = useCustomerMap();
  return (
    <div>
      <h2 className="text-xl font-black">طلبات التوفر ({data.filter((r) => r.status === "جديد").length} جديد)</h2>
      {data.length === 0 && <p className="mt-3 text-muted-foreground">لا توجد طلبات.</p>}
      <div className="mt-3 space-y-3">
        {data.map((r) => <RequestCard key={`${r.id}-${r.replied_at}`} r={r} {...(custs[r.user_id] ? { cust: custs[r.user_id] } : {})} />)}
      </div>
    </div>
  );
}

type Req = {
  id: string; user_id: string; name: string; brand: string; qty: number; note: string; image_url: string | null;
  status: string; reply_price: number | null; reply_note: string; product_id: string | null; created_at: string;
};

function RequestCard({ r, cust }: { r: Req; cust?: { clinic_name: string; phone: string } }) {
  const qc = useQueryClient();
  const { data: products = [] } = useProducts();
  const [status, setStatus] = useState(r.status);
  const [price, setPrice] = useState(r.reply_price == null ? "" : String(r.reply_price));
  const [note, setNote] = useState(r.reply_note);
  const [pid, setPid] = useState(r.product_id ?? "");
  const [busy, setBusy] = useState(false);
  const linked = products.find((p) => p.id === pid);
  const msg = (() => {
    const hi = `مرحباً ${cust?.clinic_name ?? ""}،`;
    if (status === "متوفرة")
      return `${hi} المادة "${r.name}" متوفرة لدينا${price ? ` بسعر ${fmt(Number(price))}` : ""}.${linked ? ` يمكنك طلبها من هنا: ${absUrl(`/product/${linked.id}`)}` : ""}${note ? `\n${note}` : ""}`;
    if (status === "ستتوفر قريباً") return `${hi} المادة "${r.name}" ستتوفر قريباً وسنبلغك فور وصولها.${note ? `\n${note}` : ""}`;
    if (status === "غير متوفرة") return `${hi} نعتذر، المادة "${r.name}" غير متوفرة حالياً.${note ? `\n${note}` : ""}`;
    return `${hi} بخصوص طلبك عن "${r.name}".`;
  })();
  return (
    <div className={`rounded-2xl border bg-card p-4 ${r.status === "جديد" ? "border-accent" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-black">{r.name} <span className="text-sm font-normal text-muted-foreground">× {r.qty}{r.brand && ` · ${r.brand}`}</span></div>
          <div className="text-sm text-muted-foreground">{cust?.clinic_name ?? "—"} · <span dir="ltr">{cust?.phone}</span> · {new Date(r.created_at).toLocaleDateString("ar")}</div>
          {r.note && <p className="mt-1 text-sm">{r.note}</p>}
        </div>
        {r.image_url && <a href={r.image_url} target="_blank" rel="noreferrer"><img src={r.image_url} alt="" className="h-16 w-16 rounded-xl object-cover" /></a>}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>{REQUEST_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر $" className={input} dir="ltr" />
        <select value={pid} onChange={(e) => setPid(e.target.value)} className={`${input} sm:col-span-2`}>
          <option value="">— ربط بمنتج في المتجر —</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="ملاحظة للزبون" className={`${input} sm:col-span-4`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} onClick={async () => {
          setBusy(true);
          const { error } = await supabase.from("material_requests").update({
            status, reply_price: price === "" ? null : Number(price), reply_note: note, product_id: pid || null, replied_at: new Date().toISOString(),
          }).eq("id", r.id);
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          toast.success("تم الحفظ");
          qc.invalidateQueries({ queryKey: ["admin-requests"] }); qc.invalidateQueries({ queryKey: ["req-new-count"] });
        }} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">حفظ الردّ</button>
        {cust?.phone && <a href={waLinkTo(cust.phone, msg)} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground">واتساب</a>}
        <button onClick={async () => {
          if (!confirm("حذف هذا الطلب؟")) return;
          const { error } = await supabase.from("material_requests").delete().eq("id", r.id);
          if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["admin-requests"] }); qc.invalidateQueries({ queryKey: ["req-new-count"] }); }
        }} className="rounded-full bg-muted px-5 py-2 text-sm text-destructive">حذف</button>
      </div>
    </div>
  );
}

function Watchers() {
  const qc = useQueryClient();
  const { data: products = [] } = useProducts();
  const { data: custs = {} } = useCustomerMap();
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-watch"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_watch").select("*").is("notified_at", null);
      if (error) throw error;
      return data;
    },
  });
  const groups = products
    .map((p) => ({ p, list: rows.filter((r) => r.product_id === p.id), ready: p.stock == null || p.stock > 0 }))
    .filter((g) => g.list.length > 0)
    .sort((a, b) => Number(b.ready) - Number(a.ready));
  if (groups.length === 0) return null;
  const done = async (userId: string, productId: string) => {
    const { error } = await supabase.from("stock_watch").update({ notified_at: new Date().toISOString() }).eq("user_id", userId).eq("product_id", productId);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-watch"] });
  };
  return (
    <div>
      <h2 className="text-xl font-black">عملاء ينتظرون منتجات</h2>
      <div className="mt-3 space-y-3">
        {groups.map(({ p, list, ready }) => (
          <div key={p.id} className={`rounded-2xl border bg-card p-4 ${ready ? "border-accent" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <img src={imgSrc(p.image)} alt="" className="h-12 w-12 rounded-xl object-cover" />
              <div className="flex-1"><div className="font-bold">{p.name}</div>
                <div className={`text-sm ${ready ? "font-bold text-accent" : "text-muted-foreground"}`}>
                  {ready ? `توفّر الآن — ${list.length} عميل ينتظرون` : `نافد — ${list.length} عميل ينتظرون`}
                </div></div>
            </div>
            {ready && (
              <ul className="mt-3 space-y-2">
                {list.map((w) => {
                  const c = custs[w.user_id];
                  return (
                    <li key={w.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>{c?.clinic_name ?? "—"} · <span dir="ltr">{c?.phone}</span></span>
                      <span className="flex gap-2">
                        {c?.phone && <a href={waLinkTo(c.phone, `مرحباً ${c.clinic_name}، "${p.name}" توفّر الآن في Dentist On: ${absUrl(`/product/${p.id}`)}`)} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-4 py-1.5 font-bold text-accent-foreground">واتساب</a>}
                        <button onClick={() => done(w.user_id, p.id)} className="rounded-full bg-muted px-4 py-1.5">تم الإبلاغ</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- الفريق + السجل ----------
export function Team() {
  return (
    <section className="mt-6 space-y-8">
      <StaffManager />
      <AuditLog />
    </section>
  );
}

const PERM_LABEL: Record<string, string> = {
  orders: "الطلبات (الحالة والدفع)",
  requests: "طلبات التوفر والمنتظرون",
  customers: "عرض العملاء (بلا تعديل)",
};
const genPassword = () => {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const r = new Uint32Array(10);
  crypto.getRandomValues(r);
  return Array.from(r, (x) => a[x % a.length]).join("");
};
const staffError = (m: string) =>
  m.includes("email exists") ? "هذا البريد مسجّل مسبقاً"
  : m.includes("invalid phone") ? "رقم الهاتف غير صالح (أرقام فقط)"
  : m.includes("Forbidden") ? "غير مصرّح" : "تعذّر التنفيذ، حاول مجددًا";
const credMessage = (email: string, pw: string) =>
  `مرحباً، تم إنشاء حسابك في Dentist On.\nالرابط: ${absUrl("/admin")}\nالبريد: ${email}\nكلمة المرور المؤقتة: ${pw}\nسيطلب منك النظام تغييرها عند أول دخول.`;

type Staff = { user_id: string; email: string; phone: string; permissions: string[] };

function PermBoxes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {Object.entries(PERM_LABEL).map(([k, label]) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.includes(k)} onChange={(e) => onChange(e.target.checked ? [...value, k] : value.filter((x) => x !== k))} />
          {label}
        </label>
      ))}
    </div>
  );
}

function StaffManager() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["staff-list"] });
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState(() => genPassword());
  const [perms, setPerms] = useState<string[]>(["orders"]);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ email: string; phone: string; pw: string } | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_profiles").select("*").order("created_at");
      if (error) throw error;
      return data as Staff[];
    },
  });
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-black">الموظفون</h2>
      <p className="mt-1 text-sm text-muted-foreground">أنشئ حساب الموظف وحدّد صلاحياته. يدخل من /admin بكلمة المرور المؤقتة ويُطلب منه تغييرها فورًا.</p>
      <form
        className="mt-3 space-y-3 rounded-2xl bg-secondary p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (perms.length === 0) { toast.error("اختر صلاحية واحدة على الأقل"); return; }
          setBusy(true);
          try {
            await createStaff({ data: { email, phone, password: pw, permissions: perms as ("orders" | "requests" | "customers")[] } });
            setIssued({ email, phone, pw });
            setEmail(""); setPhone(""); setPw(genPassword()); setPerms(["orders"]);
            refresh(); toast.success("تم إنشاء حساب الموظف");
          } catch (err) { toast.error(staffError(String((err as Error).message))); }
          setBusy(false);
        }}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className={input} dir="ltr" />
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} pattern="[0-9+\s\-]{9,16}" title="أرقام لاتينية فقط" placeholder="رقم الهاتف" className={input} dir="ltr" />
        </div>
        <div className="flex gap-2">
          <input required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="كلمة مرور مؤقتة" className={input} dir="ltr" />
          <button type="button" onClick={() => setPw(genPassword())} className="shrink-0 rounded-full bg-muted px-4 py-2 text-sm">توليد</button>
        </div>
        <PermBoxes value={perms} onChange={setPerms} />
        <button disabled={busy} className="rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground disabled:opacity-60">{busy ? "جارِ الإنشاء…" : "إنشاء الحساب"}</button>
      </form>
      {issued && <Issued x={issued} onClose={() => setIssued(null)} />}
      <ul className="mt-4 space-y-2">
        {data.map((s) => <StaffRow key={s.user_id} s={s} onChanged={refresh} onIssued={setIssued} />)}
        {data.length === 0 && <li className="text-sm text-muted-foreground">لا يوجد موظفون بعد.</li>}
      </ul>
    </div>
  );
}

function Issued({ x, onClose }: { x: { email: string; phone: string; pw: string }; onClose: () => void }) {
  return (
    <div className="mt-3 rounded-2xl border border-accent bg-card p-4 text-sm">
      <div className="font-black">بيانات الدخول (تظهر هنا مرة واحدة)</div>
      <div className="mt-2" dir="ltr">{x.email}</div>
      <div className="font-mono" dir="ltr">{x.pw}</div>
      <div className="mt-3 flex gap-2">
        <a href={waLinkTo(x.phone, credMessage(x.email, x.pw))} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-4 py-1.5 font-bold text-accent-foreground">أرسلها واتساب</a>
        <button onClick={onClose} className="rounded-full bg-muted px-4 py-1.5">إغلاق</button>
      </div>
    </div>
  );
}

function StaffRow({ s, onChanged, onIssued }: { s: Staff; onChanged: () => void; onIssued: (x: { email: string; phone: string; pw: string }) => void }) {
  const [edit, setEdit] = useState(false);
  const [phone, setPhone] = useState(s.phone);
  const [perms, setPerms] = useState<string[]>(s.permissions);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); onChanged(); return true; }
    catch (err) { toast.error(staffError(String((err as Error).message))); return false; }
  };
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><div dir="ltr" className="font-bold">{s.email}</div><div className="text-xs text-muted-foreground" dir="ltr">{s.phone}</div></div>
        <div className="flex flex-wrap gap-1">{s.permissions.map((p) => <span key={p} className="rounded-full bg-muted px-2 py-0.5 text-xs">{PERM_LABEL[p] ?? p}</span>)}</div>
      </div>
      {edit && (
        <div className="mt-3 space-y-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} pattern="[0-9+\s\-]{9,16}" className={input} dir="ltr" />
          <PermBoxes value={perms} onChange={setPerms} />
          <button disabled={perms.length === 0} onClick={async () => { if (await run(() => updateStaff({ data: { userId: s.user_id, phone, permissions: perms as ("orders" | "requests" | "customers")[] } }), "تم الحفظ")) setEdit(false); }} className="rounded-full bg-primary px-5 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-60">حفظ</button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button onClick={() => setEdit(!edit)} className="rounded-full bg-muted px-4 py-1.5">{edit ? "إلغاء" : "تعديل"}</button>
        <button onClick={async () => {
          if (!confirm("توليد كلمة مرور مؤقتة جديدة؟ ستنتهي كلمة مروره الحالية.")) return;
          const pw = genPassword();
          if (await run(() => updateStaff({ data: { userId: s.user_id, phone: s.phone, permissions: s.permissions as ("orders" | "requests" | "customers")[], password: pw } }), "تم تعيين كلمة مرور مؤقتة")) onIssued({ email: s.email, phone: s.phone, pw });
        }} className="rounded-full bg-muted px-4 py-1.5">كلمة مرور جديدة</button>
        <button onClick={() => { if (confirm("حذف حساب الموظف نهائيًا؟")) run(() => removeStaff({ data: { userId: s.user_id } }), "تم حذف الحساب"); }} className="rounded-full bg-muted px-4 py-1.5 text-destructive">حذف</button>
      </div>
    </li>
  );
}

// يُعرض عند أول دخول بكلمة مرور مؤقتة
export function ChangePassword() {
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-center text-3xl font-black">تغيير كلمة المرور</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">كلمة المرور الحالية مؤقتة. اختر كلمة مرور جديدة للمتابعة.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const p1 = String(f.get("p1")), p2 = String(f.get("p2"));
          if (p1 !== p2) { toast.error("كلمتا المرور غير متطابقتين"); return; }
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password: p1, data: { must_change_password: false } });
          setBusy(false);
          if (error) { toast.error(error.message.includes("different") ? "اختر كلمة مرور مختلفة عن المؤقتة" : "تعذّر التغيير، جرّب كلمة مرور أقوى"); return; }
          toast.success("تم تغيير كلمة المرور");
        }}
      >
        <input name="p1" type="password" required minLength={8} placeholder="كلمة المرور الجديدة (8 أحرف فأكثر)" className={input} dir="ltr" autoComplete="new-password" />
        <input name="p2" type="password" required minLength={8} placeholder="أعد كتابتها" className={input} dir="ltr" autoComplete="new-password" />
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">حفظ ومتابعة</button>
      </form>
    </main>
  );
}

const ENTITY: Record<string, string> = {
  orders: "الطلبات", products: "المنتجات", customers: "العملاء", store_settings: "سعر الصرف",
  shop_config: "إعدادات المتجر", promotions: "الخصومات", user_roles: "الصلاحيات", staff: "الموظفون",
};
const ACTION: Record<string, string> = { insert: "إضافة", update: "تعديل", delete: "حذف" };

function AuditLog() {
  const [ent, setEnt] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(300);
      if (error) throw error;
      return data;
    },
  });
  const rows = ent ? data.filter((r) => r.entity === ent) : data;
  const summary = (d: unknown) => {
    if (!d || typeof d !== "object") return "";
    return Object.entries(d as Record<string, unknown>).map(([k, v]) => {
      if (v && typeof v === "object" && "to" in (v as object)) {
        const x = v as { from: unknown; to: unknown };
        return `${k}: ${String(x.from ?? "—")} → ${String(x.to ?? "—")}`;
      }
      return `${k}: ${String(v ?? "—")}`;
    }).join(" · ").slice(0, 300);
  };
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">سجل العمليات</h2>
        <select value={ent} onChange={(e) => setEnt(e.target.value)} className="rounded-xl border border-input bg-card px-3 py-2 text-sm">
          <option value="">الكل</option>
          {Object.entries(ENTITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {isLoading && <p className="mt-3 text-muted-foreground">جارِ التحميل…</p>}
      {!isLoading && rows.length === 0 && <p className="mt-3 text-muted-foreground">لا توجد عمليات مسجّلة.</p>}
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><b>{ACTION[r.action] ?? r.action}</b> · {ENTITY[r.entity] ?? r.entity}{r.entity_id && <span className="text-muted-foreground" dir="ltr"> · {r.entity_id.slice(0, 8)}</span>}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.at).toLocaleString("ar")}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground" dir="ltr">{r.user_email}</div>
            <div className="mt-1 break-words">{summary(r.details)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
