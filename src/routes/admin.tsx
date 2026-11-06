import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/lib/auth";
import { categories, fmt, imgSrc, useProducts, type Product } from "@/lib/products";
import { fmtSyp, useRate } from "@/lib/rate";
import { approvalMessage, statusMessage, waLinkTo } from "@/lib/store";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Customer } from "@/lib/customer";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة المدير | Dentist On" },
      { name: "description", content: "إدارة المنتجات والطلبات في Dentist On." },
      { property: "og:title", content: "لوحة المدير | Dentist On" },
      { property: "og:description", content: "إدارة المنتجات والطلبات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const input = "w-full rounded-xl border border-input bg-card px-3 py-2";

function AdminPage() {
  const { session, isAdmin, loading } = useAdmin();
  if (loading) return <main className="py-20 text-center text-muted-foreground">جارِ التحميل…</main>;
  if (!session) return <Login />;
  if (!isAdmin)
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-black">هذا الحساب ليس حساب مدير</h1>
        <button onClick={() => supabase.auth.signOut()} className="mt-6 rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground">تسجيل الخروج</button>
      </main>
    );
  return <Dashboard email={session.user.email ?? ""} />;
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-center text-3xl font-black">حساب المدير</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">أول حساب يُنشأ هنا يصبح حساب المدير تلقائيًا.</p>
      <form
        className="mt-8 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const email = String(f.get("email")), password = String(f.get("password"));
          setBusy(true);
          const { data, error } = mode === "in"
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          if (mode === "up" && !data.session) toast.success("تحقق من بريدك الإلكتروني لتأكيد الحساب");
        }}
      >
        <input name="email" type="email" required placeholder="البريد الإلكتروني" className={input} dir="ltr" />
        <input name="password" type="password" required minLength={6} placeholder="كلمة المرور" className={input} dir="ltr" />
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">
          {mode === "in" ? "تسجيل الدخول" : "إنشاء حساب"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm text-muted-foreground underline">
        {mode === "in" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
      </button>
    </main>
  );
}

function Dashboard({ email }: { email: string }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"orders" | "customers" | "products" | "rate">("orders");
  const { data: orders = [] } = useQuery(ordersQuery);
  const { data: customers = [] } = useQuery(customersQuery);
  const badge = (t: string) => t === "orders" ? orders.filter((o) => o.status === "جديد").length : t === "customers" ? customers.filter((c) => c.status === "pending").length : 0;
  useEffect(() => {
    const ch = supabase.channel("admin-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "customers" }, (p) => {
        toast.info(`تسجيل جديد: ${(p.new as Customer).clinic_name || "عيادة"}`);
        qc.invalidateQueries({ queryKey: ["customers"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p) => {
        toast.info(`طلب جديد من ${(p.new as { customer_name: string }).customer_name}`);
        qc.invalidateQueries({ queryKey: ["orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">لوحة المدير</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span dir="ltr">{email}</span>
          <button onClick={() => supabase.auth.signOut()} aria-label="خروج"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        {(["orders", "customers", "products", "rate"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-2 font-bold ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {({ orders: "الطلبات", customers: "العملاء", products: "المنتجات", rate: "الإعدادات" } as const)[t]}
            {badge(t) > 0 && <span className="mr-1 rounded-full bg-accent px-2 text-xs text-accent-foreground">{badge(t)}</span>}
          </button>
        ))}
      </div>
      {tab === "orders" ? <Orders /> : tab === "customers" ? <Customers /> : tab === "products" ? <Products /> : <><RateSettings /><NotifySettings /></>}
    </main>
  );
}

const ordersQuery = {
  queryKey: ["orders"],
  queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};
const customersQuery = {
  queryKey: ["customers"],
  queryFn: async () => {
    const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Customer[];
  },
};

const statuses = ["جديد", "قيد التجهيز", "تم الشحن", "مكتمل", "ملغي"];

function Orders() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(ordersQuery);
  const revenue = data.filter((o) => o.status !== "ملغي").reduce((s, o) => s + Number(o.total), 0);
  const unpaid = data.filter((o) => o.status !== "ملغي" && !o.paid).reduce((s, o) => s + Number(o.total), 0);
  const weeks = weeklyCounts(data);
  return (
    <section className="mt-6">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="عدد الطلبات" value={String(data.length)} />
        <Stat label="طلبات جديدة" value={String(data.filter((o) => o.status === "جديد").length)} />
        <Stat label="إجمالي المبيعات" value={fmt(revenue)} />
        <Stat label="مكتملة هذا الأسبوع" value={String(weeks[weeks.length - 1]?.n ?? 0)} />
        <Stat label="مبالغ غير محصّلة" value={fmt(unpaid)} />
      </div>
      {isLoading && <p className="text-muted-foreground">جارِ التحميل…</p>}
      <WeeklyChart data={weeks} />
      {!isLoading && data.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد طلبات بعد</p>}
      <div className="space-y-3">
        {data.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-bold">{o.customer_name}</div>
                <div className="text-sm text-muted-foreground" dir="ltr">{o.phone}</div>
                <div className="text-sm text-muted-foreground">{o.address}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar")}</div>
              </div>
              <div className="text-left">
                <div className="text-lg font-black">{fmt(Number(o.total))}</div>
                {Number(o.total_syp) > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {Math.round(Number(o.total_syp)).toLocaleString("en-US")} ل.س · <span dir="ltr">1$ = {Number(o.exchange_rate).toLocaleString("en-US")}</span>
                  </div>
                )}
                <select
                  value={o.status}
                  onChange={async (e) => {
                    const status = e.target.value;
                    const { error } = await supabase.from("orders").update({ status }).eq("id", o.id);
                    if (error) { toast.error("تعذر التحديث"); return; }
                    qc.invalidateQueries({ queryKey: ["orders"] });
                    toast.success("تم تحديث الحالة", {
                      duration: 12000,
                      action: { label: "أبلغ الزبون", onClick: () => window.open(waLinkTo(o.phone, statusMessage(o.customer_name, o.id, status)), "_blank") },
                    });
                  }}
                  className="mt-1 rounded-lg border border-input bg-card px-2 py-1 text-sm"
                >
                  {statuses.map((s) => <option key={s}>{s}</option>)}
                </select>
                <a href={waLinkTo(o.phone, statusMessage(o.customer_name, o.id, o.status))} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-bold text-primary underline">رسالة واتساب للزبون</a>
                <label className="mt-1 flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={!!o.paid} onChange={async (e) => {
                    const { error } = await supabase.from("orders").update({ paid: e.target.checked }).eq("id", o.id);
                    if (error) toast.error("تعذر التحديث"); else qc.invalidateQueries({ queryKey: ["orders"] });
                  }} /> مدفوع
                </label>
              </div>
            </div>
            <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              {(o.items as { name: string; qty: number; unit: number }[]).map((i, k) => (
                <li key={k} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>{fmt(i.unit * i.qty)}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-secondary p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="text-2xl font-black">{value}</div></div>;
}

const empty: Product = { id: "", name: "", brand: "", category: "أدوات يدوية", price: 0, bulk_price: 0, image: "instruments", description: "", active: true, stock: null };

function Products() {
  const qc = useQueryClient();
  const { data = [] } = useProducts();
  const [edit, setEdit] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["products"] });

  return (
    <section className="mt-6">
      <button onClick={() => { setEdit({ ...empty }); setIsNew(true); }} className="mb-4 flex items-center gap-2 rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground">
        <Plus className="h-4 w-4" /> منتج جديد
      </button>
      {edit && (
        <form
          className="mb-6 grid gap-3 rounded-2xl bg-secondary p-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const row = { ...edit, id: isNew ? edit.id || crypto.randomUUID().slice(0, 8) : edit.id };
            const { error } = isNew ? await supabase.from("products").insert(row) : await supabase.from("products").update(row).eq("id", edit.id);
            if (error) { toast.error(error.message); return; }
            toast.success("تم الحفظ"); setEdit(null); refresh();
          }}
        >
          <input required placeholder="اسم المنتج" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={input} />
          <input placeholder="الماركة" value={edit.brand} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} className={input} />
          <select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} className={input}>
            {categories.slice(1).map((c) => <option key={c}>{c}</option>)}
          </select>
          <input placeholder="رابط الصورة (https://...)" value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} className={input} dir="ltr" />
          <label className="text-sm">رفع صورة<input type="file" accept="image/*" className={input} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const path = `${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
            const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
            if (error) { toast.error(error.message); return; }
            setEdit({ ...edit, image: supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl });
            toast.success("تم رفع الصورة");
          }} /></label>
          <label className="text-sm">المخزون (فارغ = غير محدود)<input type="number" min="0" value={edit.stock ?? ""} onChange={(e) => setEdit({ ...edit, stock: e.target.value === "" ? null : Number(e.target.value) })} className={input} /></label>
          <label className="text-sm">السعر<input type="number" step="0.01" min="0" required value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} className={input} /></label>
          <label className="text-sm">سعر الجملة (10+)<input type="number" step="0.01" min="0" required value={edit.bulk_price} onChange={(e) => setEdit({ ...edit, bulk_price: Number(e.target.value) })} className={input} /></label>
          <textarea placeholder="الوصف" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className={`${input} sm:col-span-2`} rows={3} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> ظاهر في المتجر</label>
          <div className="flex gap-2 sm:justify-end">
            <button type="button" onClick={() => setEdit(null)} className="rounded-full bg-muted px-5 py-2">إلغاء</button>
            <button className="rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground">حفظ</button>
          </div>
        </form>
      )}
      <div className="space-y-2">
        {data.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <img src={imgSrc(p.image)} alt="" className="h-14 w-14 rounded-xl object-cover" />
            <div className="flex-1">
              <div className="font-bold leading-snug">{p.name} {!p.active && <span className="text-xs text-muted-foreground">(مخفي)</span>}</div>
              <div className="text-sm text-muted-foreground">{p.category} · {fmt(p.price)} / {fmt(p.bulk_price)} · {p.stock == null ? "مخزون غير محدود" : `المخزون: ${p.stock}`}</div>
            </div>
            <button aria-label="تعديل" onClick={() => { setEdit(p); setIsNew(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="h-4 w-4" /></button>
            <button aria-label="حذف" className="text-destructive" onClick={async () => {
              if (!confirm("حذف المنتج؟")) return;
              const { error } = await supabase.from("products").delete().eq("id", p.id);
              if (error) toast.error(error.message); else refresh();
            }}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}

function RateSettings() {
  const qc = useQueryClient();
  const { data } = useRate();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const current = data?.rate ?? 0;
  const n = Number(value);
  return (
    <section className="mt-6 max-w-md">
      <div className="rounded-2xl bg-secondary p-5">
        <div className="text-sm text-muted-foreground">سعر الصرف الحالي</div>
        <div className="text-2xl font-black" dir="ltr">
          {current > 0 ? `1 $ = ${current.toLocaleString("en-US")} ل.س` : "غير محدد"}
        </div>
        {current > 0 && data?.updatedAt && (
          <div className="text-xs text-muted-foreground">آخر تحديث: {new Date(data.updatedAt).toLocaleString("ar")}</div>
        )}
        {current === 0 && <div className="mt-1 text-xs text-destructive">حتى تحدده، يرى الزبائن الأسعار بالدولار فقط.</div>}
      </div>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!Number.isFinite(n) || n <= 0) { toast.error("أدخل رقمًا أكبر من صفر"); return; }
          setBusy(true);
          const { error } = await supabase.from("store_settings").upsert({ key: "usd_to_syp", value: n });
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          toast.success("تم تحديث سعر الصرف");
          setValue("");
          qc.invalidateQueries({ queryKey: ["usd_to_syp"] });
        }}
      >
        <label className="block text-sm">
          سعر الدولار اليوم (ليرة سورية)
          <input type="number" step="any" min="0" required value={value} onChange={(e) => setValue(e.target.value)} className={input} dir="ltr" placeholder="0" />
        </label>
        {n > 0 && <p className="text-sm text-muted-foreground">معاينة: 10$ = {fmtSyp(10, n)}</p>}
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "جارِ الحفظ…" : "تحديث سعر الصرف"}
        </button>
        <p className="text-xs text-muted-foreground">الطلبات الجديدة تُسجَّل بسعر الصرف وقت الطلب، والقديمة لا تتغير.</p>
      </form>
    </section>
  );
}

function Customers() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(customersQuery);
  const label = { pending: "بانتظار الموافقة", approved: "مفعّل", rejected: "مرفوض" } as const;
  const sorted = [...data].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  const setStatus = async (c: Customer, status: Customer["status"]) => {
    const { error } = await supabase.from("customers").update({ status, approved_at: status === "approved" ? new Date().toISOString() : null }).eq("user_id", c.user_id);
    if (error) { toast.error("تعذر التحديث"); return; }
    qc.invalidateQueries({ queryKey: ["customers"] });
    if (status === "approved")
      toast.success("تمت الموافقة", {
        duration: 15000,
        action: { label: "أرسل واتساب", onClick: () => window.open(waLinkTo(c.phone, approvalMessage(c.clinic_name, `${window.location.origin}/cart`)), "_blank") },
      });
  };
  return (
    <section className="mt-6 space-y-3">
      {isLoading && <p className="text-muted-foreground">جارِ التحميل…</p>}
      {!isLoading && data.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد تسجيلات بعد</p>}
      {sorted.map((c) => (
        <div key={c.user_id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-bold">{c.clinic_name}</div>
              <div className="text-sm text-muted-foreground" dir="ltr">{c.phone}</div>
              <div className="text-sm text-muted-foreground">{c.address}</div>
              <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("ar")}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${c.status === "pending" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{label[c.status]}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.status !== "approved" && <button onClick={() => setStatus(c, "approved")} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">موافقة</button>}
            {c.status === "pending" && <button onClick={() => setStatus(c, "rejected")} className="rounded-full bg-muted px-5 py-2 text-sm">رفض</button>}
            {c.status === "approved" && (
              <a href={waLinkTo(c.phone, approvalMessage(c.clinic_name, `${window.location.origin}/cart`))} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground">رسالة واتساب</a>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

function NotifySettings() {
  const qc = useQueryClient();
  const { data: saved = "" } = useQuery({
    queryKey: ["ntfy_topic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notify_settings").select("value").eq("key", "ntfy_topic").maybeSingle();
      if (error) throw error;
      return data?.value ?? "";
    },
  });
  const [edited, setEdited] = useState<string | null>(null);
  const topic = (edited ?? saved).trim();
  const gen = () => {
    const b = crypto.getRandomValues(new Uint8Array(9));
    setEdited("dentist-on-" + Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 14));
  };
  return (
    <section className="mt-8 max-w-md">
      <div className="rounded-2xl bg-secondary p-5">
        <div className="font-bold">إشعارات على هاتفك</div>
        <p className="mt-1 text-xs text-muted-foreground">ثبّت تطبيق ntfy واشترك بنفس الاسم أدناه لتصلك إشعارات التسجيلات والطلبات حتى والموقع مغلق. اختر اسماً طويلاً عشوائياً ولا تشاركه.</p>
        <input value={edited ?? saved} onChange={(e) => setEdited(e.target.value)} dir="ltr" placeholder="اسم الموضوع" className={`${input} mt-3`} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={gen} className="rounded-full bg-muted px-4 py-2 text-sm">توليد اسم</button>
          <button
            type="button"
            onClick={async () => {
              if (!/^[A-Za-z0-9_-]{1,64}$/.test(topic)) { toast.error("الاسم: أحرف إنجليزية وأرقام و - و _ فقط، بلا مسافات"); return; }
              const { error } = await supabase.from("notify_settings").upsert({ key: "ntfy_topic", value: topic });
              if (error) { toast.error(error.message); return; }
              toast.success("تم الحفظ"); setEdited(null); qc.invalidateQueries({ queryKey: ["ntfy_topic"] });
            }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
          >حفظ</button>
          <button
            type="button"
            disabled={!topic}
            onClick={async () => {
              try {
                const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, { method: "POST", body: "إشعار تجريبي من Dentist On" });
                if (!res.ok) { toast.error(`رفض ntfy الإرسال (${res.status}). استخدم أحرفاً إنجليزية وأرقاماً و - و _ فقط`); return; }
                toast.success("أُرسل الإشعار التجريبي");
              } catch { toast.error("تعذر الاتصال بـ ntfy"); }
            }}
            className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50"
          >إشعار تجريبي</button>
        </div>
      </div>
    </section>
  );
}

type Wk = { label: string; n: number };
// الأسبوع يبدأ السبت؛ آخر عنصر = الأسبوع الحالي
function weeklyCounts(orders: { status: string; completed_at?: string | null }[], weeks = 8): Wk[] {
  const start = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 1) % 7)); return x; };
  const cur = start(new Date());
  const out: Wk[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const s = new Date(cur); s.setDate(s.getDate() - i * 7);
    const e = new Date(s); e.setDate(e.getDate() + 7);
    out.push({
      label: `${s.getDate()}/${s.getMonth() + 1}`,
      n: orders.filter((o) => o.status === "مكتمل" && o.completed_at && new Date(o.completed_at) >= s && new Date(o.completed_at) < e).length,
    });
  }
  return out;
}

function WeeklyChart({ data }: { data: Wk[] }) {
  return (
    <div className="mb-4 rounded-2xl bg-secondary p-4">
      <div className="text-sm text-muted-foreground">الطلبات المكتملة أسبوعياً (آخر 8 أسابيع)</div>
      <div className="mt-2 h-44 w-full text-primary" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} width={24} />
            <Tooltip />
            <Bar dataKey="n" name="مكتمل" fill="currentColor" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
