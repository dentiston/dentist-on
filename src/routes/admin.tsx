import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/lib/auth";
import { categories, fmt, imgSrc, unitPrice, useProducts, type Product } from "@/lib/products";
import { ProductImport } from "@/components/ProductImport";
import { defaultHome, useShopConfig, type HomeConfig } from "@/lib/config";
import { printInvoice, type InvoiceOrder } from "@/lib/invoice";
import { fmtSyp, useRate } from "@/lib/rate";
import { approvalMessage, reminderMessage, statusMessage, waLinkTo } from "@/lib/store";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Customer } from "@/lib/customer";
import { ChangePassword, MaterialRequests, Team, useNewRequests } from "@/components/AdminExtras";
import { AdminShell } from "@/components/AdminShell";
import { AdminOverview } from "@/components/AdminOverview";
import { AdminCards } from "@/components/AdminCards";
import { AboutEditor, ReviewsAdmin, BundlesAdmin, CustomerDistributor, DistributorsAdmin, ServiceRequestsAdmin, UsedItemsAdmin, useDistributors, useHubCounts } from "@/components/AdminHub";

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

const ALL_TABS = ["hub", "overview", "orders", "requests", "customers", "carts", "promos", "home", "products", "bundles", "distributors", "used", "services", "reviews", "rate", "team"] as const;
type Tab = (typeof ALL_TABS)[number];

function AdminPage() {
  const { session, isAdmin, isStaff, perms, loading } = useAdmin();
  if (loading) return <main className="py-20 text-center text-muted-foreground">جارِ التحميل…</main>;
  if (!session) return <Login />;
  if (session.user.user_metadata?.["must_change_password"]) return <ChangePassword />;
  if (!isAdmin && !isStaff)
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-black">هذا الحساب ليس حساب مدير</h1>
        <button onClick={() => supabase.auth.signOut()} className="mt-6 rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground">تسجيل الخروج</button>
      </main>
    );
  return <Dashboard email={session.user.email ?? ""} staff={!isAdmin} perms={perms} />;
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const { data: adminExists } = useQuery({
    queryKey: ["admin_exists"],
    queryFn: async () => { const { data, error } = await supabase.rpc("admin_exists"); if (error) throw error; return !!data; },
  });
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-center text-3xl font-black">حساب المدير</h1>
      {adminExists === false && <p className="mt-2 text-center text-sm text-muted-foreground">أول حساب يُنشأ هنا يصبح حساب المدير تلقائيًا.</p>}
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
      <button hidden={adminExists !== false} onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm text-muted-foreground underline">
        {mode === "in" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
      </button>
    </main>
  );
}

function Dashboard({ email, staff, perms }: { email: string; staff: boolean; perms: string[] }) {
  const qc = useQueryClient();
  const tabs: readonly Tab[] = staff ? ALL_TABS.filter((t) => t === "hub" || ((t === "orders" || t === "requests" || t === "customers") && perms.includes(t))) : ALL_TABS;
  const fromHash = (): Tab => {
    const h = typeof window === "undefined" ? "" : window.location.hash.slice(1);
    return (tabs as readonly string[]).includes(h) ? (h as Tab) : (tabs[0] ?? "orders");
  };
  const [tab, setTabState] = useState<Tab>(fromHash);
  // القسم الحالي يُحفظ في الرابط (#orders): يعمل زر الرجوع ويبقى القسم بعد التحديث
  useEffect(() => {
    const on = () => setTabState(fromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, perms.join()]);
  const go = (t: string) => { if ((tabs as readonly string[]).includes(t)) { window.location.hash = t; setTabState(t as Tab); } };
  const { data: orders = [] } = useQuery(ordersQuery);
  const { data: customers = [] } = useQuery({ ...customersQuery, enabled: !staff });
  const { data: newReq = 0 } = useNewRequests(!staff || perms.includes("requests"));
  const { data: hub } = useHubCounts(!staff);
  const badges: Record<string, number> = {
    used: hub?.used ?? 0, services: hub?.services ?? 0,
    orders: orders.filter((o) => o.status === "جديد").length,
    customers: customers.filter((c) => c.status === "pending").length,
    requests: newReq,
  };
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
    <main>
      <AdminShell items={[...tabs]} tab={tab} go={go} badges={badges} email={email} onSignOut={() => supabase.auth.signOut()} onRefresh={() => qc.invalidateQueries()}>
        {tab === "hub" ? <AdminCards items={[...tabs]} badges={badges} go={go} canEdit={!staff} /> : tab === "overview" ? <AdminOverview orders={orders} badges={badges} statuses={statuses} go={go} /> : tab === "orders" ? <Orders staff={staff} /> : tab === "requests" ? <MaterialRequests /> : tab === "team" ? <Team /> : tab === "customers" ? <Customers readOnly={staff} /> : tab === "carts" ? <AbandonedCarts /> : tab === "promos" ? <Promotions /> : tab === "home" ? <HomeEditor /> : tab === "products" ? <Products /> : tab === "bundles" ? <BundlesAdmin /> : tab === "distributors" ? <DistributorsAdmin /> : tab === "used" ? <UsedItemsAdmin /> : tab === "services" ? <ServiceRequestsAdmin /> : tab === "reviews" ? <ReviewsAdmin /> : <><RateSettings /><ShopRules /><AboutEditor /><NotifySettings /></>}
      </AdminShell>
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

function Orders({ staff = false }: { staff?: boolean }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(ordersQuery);
  const revenue = data.filter((o) => o.status !== "ملغي").reduce((s, o) => s + Number(o.total), 0);
  const unpaid = data.filter((o) => o.status !== "ملغي" && !o.paid).reduce((s, o) => s + Number(o.total), 0);
  const weeks = weeklyCounts(data);
  const [fs, setFs] = useState("الكل");
  const [oq, setOq] = useState("");
  const nq = oq.trim().toLowerCase();
  const shown = data.filter((o) => (fs === "الكل" || o.status === fs) && (!nq || [o.customer_name, o.phone, o.id, o.address].some((t) => String(t ?? "").toLowerCase().includes(nq))));
  return (
    <section className="mt-6">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="عدد الطلبات" value={String(data.length)} />
        <Stat label="طلبات جديدة" value={String(data.filter((o) => o.status === "جديد").length)} />
        {!staff && <Stat label="إجمالي المبيعات" value={fmt(revenue)} />}
        <Stat label="مكتملة هذا الأسبوع" value={String(weeks[weeks.length - 1]?.n ?? 0)} />
        {!staff && <Stat label="مبالغ غير محصّلة" value={fmt(unpaid)} />}
      </div>
      {isLoading && <p className="text-muted-foreground">جارِ التحميل…</p>}
      <WeeklyChart data={weeks} />
      {!isLoading && data.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد طلبات بعد</p>}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input value={oq} onChange={(e) => setOq(e.target.value)} placeholder="ابحث باسم الزبون أو الهاتف أو رقم الطلب…" className={`${input} sm:max-w-xs`} />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["الكل", ...statuses].map((s) => {
            const n = s === "الكل" ? data.length : data.filter((o) => o.status === s).length;
            return (
              <button key={s} type="button" onClick={() => setFs(s)} aria-pressed={fs === s}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold transition active:scale-95 ${fs === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-secondary"}`}>
                {s} <span className="opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      </div>
      {shown.length === 0 && data.length > 0 && <p className="py-8 text-center text-muted-foreground">لا طلبات تطابق التصفية</p>}
      <div className="space-y-3">
        {shown.map((o) => (
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
                <button onClick={() => { if (!printInvoice(o as unknown as InvoiceOrder)) toast.error("اسمح بالنوافذ المنبثقة لطباعة الفاتورة"); }} className="mt-1 block text-xs font-bold text-primary underline">طباعة فاتورة</button>
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

const empty: Product = { id: "", name: "", brand: "", category: "أدوات يدوية", price: 0, bulk_price: 0, image: "instruments", description: "", active: true, stock: null, images: [] };

function Products() {
  const qc = useQueryClient();
  const { data = [] } = useProducts();
  const { data: cfg } = useShopConfig();
  const low = data.filter((p) => p.stock != null && p.stock <= (cfg?.lowStock ?? 5));
  const [edit, setEdit] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["products"] });

  return (
    <section className="mt-6">
      {low.length > 0 && (
        <div className="mb-4 rounded-2xl border border-destructive/40 bg-card p-4 text-sm">
          <div className="font-bold text-destructive">مخزون منخفض ({low.length})</div>
          <ul className="mt-2 space-y-1">{low.map((p) => <li key={p.id}>{p.name} — المتبقي {p.stock}</li>)}</ul>
        </div>
      )}
      <ProductImport onDone={refresh} />
      <button onClick={() => { setEdit({ ...empty }); setIsNew(true); }} className="mb-4 flex items-center gap-2 rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground">
        <Plus className="h-4 w-4" /> منتج جديد
      </button>
      {edit && (
        <form
          className="mb-6 grid gap-3 rounded-2xl bg-secondary p-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const row = { ...edit, images: edit.images ?? [], id: isNew ? edit.id || crypto.randomUUID().slice(0, 8) : edit.id };
            const { error } = isNew ? await supabase.from("products").insert(row) : await supabase.from("products").update(row).eq("id", edit.id);
            if (error) { toast.error(error.message); return; }
            toast.success("تم الحفظ"); setEdit(null); refresh();
          }}
        >
          <input required placeholder="اسم المنتج" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={input} />
          <input placeholder="الماركة" value={edit.brand} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} className={input} />
          <input list="cat-list" required placeholder="التصنيف" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} className={input} />
          <datalist id="cat-list">{categories.slice(1).map((c) => <option key={c} value={c} />)}</datalist>
          <input placeholder="رابط الصورة (https://...)" value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} className={input} dir="ltr" />
          <label className="text-sm">رفع صورة<input type="file" accept="image/*" className={input} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const path = `${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
            const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
            if (error) { toast.error(error.message); return; }
            setEdit({ ...edit, image: supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl });
            toast.success("تم رفع الصورة");
          }} /></label>
          <div className="sm:col-span-2">
            <div className="text-sm">صور إضافية</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(edit.images ?? []).map((src, k) => (
                <div key={src} className="relative">
                  <img src={imgSrc(src)} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <button type="button" aria-label="حذف الصورة" onClick={() => setEdit({ ...edit, images: (edit.images ?? []).filter((_, j) => j !== k) })} className="absolute -top-2 -left-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-xs text-white">×</button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" multiple className={`${input} mt-2`} onChange={async (e) => {
              const files = Array.from(e.target.files ?? []); if (files.length === 0) return;
              const urls: string[] = [];
              for (const file of files) {
                const path = `${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
                const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
                if (error) { toast.error(error.message); continue; }
                urls.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
              }
              if (urls.length) { setEdit({ ...edit, images: [...(edit.images ?? []), ...urls] }); toast.success(`تم رفع ${urls.length} صورة`); }
              e.target.value = "";
            }} />
          </div>
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

const did = (c: unknown) => (c as { distributor_id?: string | null }).distributor_id;

function Customers({ readOnly = false }: { readOnly?: boolean }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(customersQuery);
  const label = { pending: "بانتظار الموافقة", approved: "مفعّل", rejected: "مرفوض" } as const;
  const { data: dists = [] } = useDistributors(!readOnly);
  const distName = (id?: string | null) => dists.find((d) => d.id === id)?.name;
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
              {distName(did(c)) && <div className="text-sm">الموزع: <b>{distName(did(c))}</b></div>}
              <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("ar")}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${c.status === "pending" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{label[c.status]}</span>
          </div>
          <div className={`mt-3 flex flex-wrap gap-2 ${readOnly ? "hidden" : ""}`}>
            {c.status === "approved" && (
              <label className="flex items-center gap-2 text-sm">خصم %
                <input type="number" min="0" max="100" step="0.5" defaultValue={c.discount_percent ?? 0} className="w-20 rounded-lg border border-input bg-card px-2 py-1"
                  onBlur={async (e) => {
                    const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                    if (v === Number(c.discount_percent ?? 0)) return;
                    const { error } = await supabase.from("customers").update({ discount_percent: v }).eq("user_id", c.user_id);
                    if (error) toast.error("تعذر الحفظ"); else { toast.success("تم حفظ الخصم"); qc.invalidateQueries({ queryKey: ["customers"] }); }
                  }} />
              </label>
            )}
            <CustomerDistributor userId={c.user_id} current={did(c)} />
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

type CartRow = { user_id: string; items: Record<string, number> | null; updated_at: string; reminded_at: string | null };

function AbandonedCarts() {
  const qc = useQueryClient();
  const [days, setDays] = useState(2);
  const { data: carts = [], isLoading } = useQuery({
    queryKey: ["admin-carts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_carts").select("*");
      if (error) throw error;
      return data as unknown as CartRow[];
    },
  });
  const { data: customers = [] } = useQuery(customersQuery);
  const { data: products = [] } = useProducts();
  const cutoff = Date.now() - days * 86_400_000;
  const rows = carts
    .map((c) => {
      const cust = customers.find((x) => x.user_id === c.user_id);
      const lines = Object.entries(c.items ?? {})
        .map(([id, qty]) => ({ p: products.find((p) => p.id === id), qty: Number(qty) }))
        .filter((l): l is { p: Product; qty: number } => !!l.p && l.qty > 0);
      const disc = Number(cust?.discount_percent ?? 0);
      const total = lines.reduce((s, l) => s + unitPrice(l.p, l.qty, disc) * l.qty, 0);
      return { c, cust, lines, total };
    })
    .filter((r) => r.cust?.status === "approved" && r.lines.length > 0 && new Date(r.c.updated_at).getTime() < cutoff)
    .sort((a, b) => new Date(a.c.updated_at).getTime() - new Date(b.c.updated_at).getTime());

  return (
    <section className="mt-6">
      <label className="flex items-center gap-2 text-sm">سلال لم تُحدَّث منذ
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-input bg-card px-2 py-1">
          {[1, 2, 3, 7].map((d) => <option key={d} value={d}>{d} {d === 1 ? "يوم" : "أيام"}</option>)}
        </select>
      </label>
      {isLoading && <p className="mt-4 text-muted-foreground">جارِ التحميل…</p>}
      {!isLoading && rows.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد سلال متروكة لعملاء مفعّلين</p>}
      <div className="mt-4 space-y-3">
        {rows.map(({ c, cust, lines, total }) => (
          <div key={c.user_id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-bold">{cust?.clinic_name}</div>
                <div className="text-sm text-muted-foreground" dir="ltr">{cust?.phone}</div>
                <div className="text-xs text-muted-foreground">آخر تعديل: {new Date(c.updated_at).toLocaleDateString("ar")}</div>
                {c.reminded_at && <div className="text-xs text-muted-foreground">آخر تذكير: {new Date(c.reminded_at).toLocaleDateString("ar")}</div>}
              </div>
              <b>{fmt(total)}</b>
            </div>
            <ul className="mt-3 space-y-0.5 border-t border-border pt-3 text-sm">
              {lines.map((l) => <li key={l.p.id}>{l.p.name} × {l.qty}</li>)}
            </ul>
            <a
              href={waLinkTo(cust?.phone ?? "", reminderMessage(cust?.clinic_name ?? "", lines.map((l) => ({ name: l.p.name, qty: l.qty })), `${window.location.origin}/cart`))}
              target="_blank" rel="noreferrer"
              onClick={() => { supabase.from("customer_carts").update({ reminded_at: new Date().toISOString() }).eq("user_id", c.user_id).then(() => qc.invalidateQueries({ queryKey: ["admin-carts"] })); }}
              className="mt-3 inline-block rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground"
            >تذكير عبر واتساب</a>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShopRules() {
  const qc = useQueryClient();
  const { data: cfg } = useShopConfig();
  const [min, setMin] = useState<string | null>(null);
  const [zones, setZones] = useState<string | null>(null);
  const [low, setLow] = useState<string | null>(null);
  const zonesSaved = Object.entries(cfg?.zones ?? {}).map(([z, f]) => `${z}=${f}`).join("\n");
  return (
    <section className="mt-8 max-w-md">
      <div className="rounded-2xl bg-secondary p-5">
        <div className="font-bold">قواعد الطلب</div>
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fees: Record<string, number> = {};
            for (const line of (zones ?? zonesSaved).split("\n")) {
              const [z, f] = line.split("=");
              const raw = (f ?? "").trim();
              const fee = Number(raw);
              if (z && z.trim() && raw !== "" && Number.isFinite(fee) && fee >= 0) fees[z.trim()] = fee;
            }
            const rows = [
              { key: "min_order_usd", value: Math.max(0, Number(min ?? cfg?.minOrder ?? 0) || 0) },
              { key: "delivery_fees", value: fees },
              { key: "low_stock_threshold", value: Math.max(0, Math.floor(Number(low ?? cfg?.lowStock ?? 5) || 0)) },
            ];
            const { error } = await supabase.from("shop_config").upsert(rows);
            if (error) { toast.error(error.message); return; }
            toast.success("تم حفظ القواعد");
            setMin(null); setZones(null); setLow(null);
            qc.invalidateQueries({ queryKey: ["shop_config"] });
          }}
        >
          <label className="block text-sm">الحد الأدنى للطلب ($) — 0 = بلا حد
            <input type="number" min="0" step="any" value={min ?? String(cfg?.minOrder ?? 0)} onChange={(e) => setMin(e.target.value)} className={input} dir="ltr" />
          </label>
          <label className="block text-sm">رسوم التوصيل حسب المنطقة — سطر لكل منطقة بالشكل «الاسم=الرسوم بالدولار»، والفراغ يعطّلها
            <textarea rows={4} value={zones ?? zonesSaved} onChange={(e) => setZones(e.target.value)} className={input} placeholder={"دمشق=2\nريف دمشق=4"} />
          </label>
          <label className="block text-sm">تنبيه المخزون عندما يصل المتبقي إلى
            <input type="number" min="0" value={low ?? String(cfg?.lowStock ?? 5)} onChange={(e) => setLow(e.target.value)} className={input} dir="ltr" />
          </label>
          <button className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">حفظ القواعد</button>
        </form>
      </div>
    </section>
  );
}

type PromoRow = {
  id: string; name: string; percent: number; scope: "all" | "category" | "product"; target: string | null; code: string | null;
  min_order: number; starts_at: string | null; ends_at: string | null; max_uses: number | null; used_count: number; active: boolean;
};
type PromoForm = {
  id?: string; name: string; percent: string; scope: PromoRow["scope"]; target: string; code: string;
  min_order: string; starts_at: string; ends_at: string; max_uses: string; active: boolean;
};
const blankPromo: PromoForm = { name: "", percent: "10", scope: "all", target: "", code: "", min_order: "0", starts_at: "", ends_at: "", max_uses: "", active: true };
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function Promotions() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-promos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PromoRow[];
    },
  });
  const { data: products = [] } = useProducts();
  const cats = Array.from(new Set([...categories.slice(1), ...products.map((p) => p.category)]));
  const [f, setF] = useState<PromoForm | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-promos"] }); qc.invalidateQueries({ queryKey: ["promos"] }); };
  const state = (x: PromoRow) => {
    const now = Date.now();
    if (!x.active) return "متوقف";
    if (x.starts_at && new Date(x.starts_at).getTime() > now) return "مجدول";
    if (x.ends_at && new Date(x.ends_at).getTime() <= now) return "منتهٍ";
    if (x.max_uses != null && x.used_count >= x.max_uses) return "استُنفد";
    return "فعّال";
  };
  const targetName = (x: PromoRow) =>
    x.scope === "all" ? "كل المنتجات" : x.scope === "category" ? `تصنيف: ${x.target}` : `منتج: ${products.find((p) => p.id === x.target)?.name ?? x.target}`;

  return (
    <section className="mt-6">
      <p className="text-sm text-muted-foreground">خصم تلقائي (بلا كود) يظهر على الأسعار فوراً، أو قسيمة بكود يدخله الزبون في السلة. عند تعدد الخصومات يُطبَّق الأفضل للزبون ولا تتراكم.</p>
      <button onClick={() => setF({ ...blankPromo })} className="mt-4 rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground">+ خصم جديد</button>

      {f && (
        <form
          className="mt-4 grid max-w-xl gap-3 rounded-2xl bg-secondary p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const pct = Number(f.percent);
            if (!(pct > 0 && pct <= 90)) { toast.error("النسبة بين 1 و90"); return; }
            if (f.scope !== "all" && !f.target) { toast.error("اختر التصنيف أو المنتج"); return; }
            const code = f.code.trim().toUpperCase();
            if (code && !/^[A-Z0-9_-]{3,30}$/.test(code)) { toast.error("الكود: أحرف إنجليزية وأرقام و - و _ (3 إلى 30)"); return; }
            const row = {
              name: f.name.trim(), percent: pct, scope: f.scope, target: f.scope === "all" ? null : f.target, code: code || null,
              min_order: code ? Math.max(0, Number(f.min_order) || 0) : 0,
              starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
              ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null,
              max_uses: code && f.max_uses !== "" ? Math.max(1, Math.floor(Number(f.max_uses))) : null,
              active: f.active,
            };
            const { error } = f.id ? await supabase.from("promotions").update(row).eq("id", f.id) : await supabase.from("promotions").insert(row);
            if (error) { toast.error(error.message.includes("duplicate") ? "هذا الكود مستخدم" : error.message); return; }
            toast.success("تم الحفظ"); setF(null); refresh();
          }}
        >
          <label className="text-sm">اسم الخصم<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="مثال: عرض الشتاء" className={input} /></label>
          <label className="text-sm">النسبة %<input required type="number" min="1" max="90" step="0.5" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} className={input} dir="ltr" /></label>
          <label className="text-sm">يُطبَّق على
            <select value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as PromoRow["scope"], target: "" })} className={input}>
              <option value="all">كل المنتجات</option><option value="category">تصنيف</option><option value="product">منتج محدد</option>
            </select>
          </label>
          {f.scope === "category" && (
            <select required value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} className={input}>
              <option value="" disabled>اختر التصنيف</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {f.scope === "product" && (
            <select required value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} className={input}>
              <option value="" disabled>اختر المنتج</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <label className="text-sm">كود القسيمة — اتركه فارغاً لخصم تلقائي<input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="WINTER10" className={input} dir="ltr" /></label>
          {f.code.trim() && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">حد أدنى للطلب ($)<input type="number" min="0" step="any" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} className={input} dir="ltr" /></label>
              <label className="text-sm">أقصى عدد استخدامات<input type="number" min="1" value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value })} placeholder="بلا حد" className={input} dir="ltr" /></label>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">يبدأ<input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} className={input} dir="ltr" /></label>
            <label className="text-sm">ينتهي<input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} className={input} dir="ltr" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> مفعّل</label>
          <div className="flex gap-2">
            <button className="rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground">حفظ</button>
            <button type="button" onClick={() => setF(null)} className="rounded-full bg-muted px-6 py-2">إلغاء</button>
          </div>
        </form>
      )}

      {isLoading && <p className="mt-4 text-muted-foreground">جارِ التحميل…</p>}
      {!isLoading && data.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد خصومات بعد</p>}
      <div className="mt-4 space-y-3">
        {data.map((x) => (
          <div key={x.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-bold">{x.name} — {x.percent}%</div>
                <div className="text-sm text-muted-foreground">{targetName(x)}</div>
                {x.code ? <div className="text-sm" dir="ltr">كود: <b>{x.code}</b> · استُخدم {x.used_count}{x.max_uses != null ? ` / ${x.max_uses}` : ""}{x.min_order > 0 ? ` · حد أدنى $${x.min_order}` : ""}</div> : <div className="text-sm text-muted-foreground">خصم تلقائي</div>}
                {(x.starts_at || x.ends_at) && <div className="text-xs text-muted-foreground">{x.starts_at ? `من ${new Date(x.starts_at).toLocaleDateString("ar")}` : ""} {x.ends_at ? `إلى ${new Date(x.ends_at).toLocaleDateString("ar")}` : ""}</div>}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${state(x) === "فعّال" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{state(x)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={async () => { await supabase.from("promotions").update({ active: !x.active }).eq("id", x.id); refresh(); }} className="rounded-full bg-muted px-4 py-2 text-sm">{x.active ? "إيقاف" : "تفعيل"}</button>
              <button onClick={() => setF({ id: x.id, name: x.name, percent: String(x.percent), scope: x.scope, target: x.target ?? "", code: x.code ?? "", min_order: String(x.min_order), starts_at: toLocalInput(x.starts_at), ends_at: toLocalInput(x.ends_at), max_uses: x.max_uses == null ? "" : String(x.max_uses), active: x.active })} className="rounded-full bg-muted px-4 py-2 text-sm">تعديل</button>
              <button onClick={async () => { if (!confirm("حذف هذا الخصم؟")) return; await supabase.from("promotions").delete().eq("id", x.id); refresh(); }} className="rounded-full bg-muted px-4 py-2 text-sm text-destructive">حذف</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeEditor() {
  const qc = useQueryClient();
  const { data: cfg } = useShopConfig();
  const { data: products = [] } = useProducts();
  const [draft, setDraft] = useState<HomeConfig | null>(null);
  const [filter, setFilter] = useState("");
  const h = draft ?? cfg?.home ?? defaultHome;
  const upd = (patch: Partial<HomeConfig>) => setDraft({ ...h, ...patch });
  const shown = products.filter((p) => p.name.includes(filter));

  return (
    <section className="mt-6 max-w-xl space-y-5">
      <div className="rounded-2xl bg-secondary p-5">
        <div className="font-bold">شريط إعلان أعلى الصفحة</div>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={h.announcement.enabled} onChange={(e) => upd({ announcement: { ...h.announcement, enabled: e.target.checked } })} /> إظهار الشريط</label>
        <input value={h.announcement.text} onChange={(e) => upd({ announcement: { ...h.announcement, text: e.target.value } })} placeholder="مثال: خصم 15% على المواد الترميمية حتى نهاية الشهر" className={`${input} mt-2`} />
      </div>

      <div className="rounded-2xl bg-secondary p-5">
        <div className="font-bold">الواجهة الرئيسية</div>
        <label className="mt-2 block text-sm">العنوان — ضع الجزء الملوّن بين نجمتين *هكذا*
          <input value={h.hero.title} onChange={(e) => upd({ hero: { ...h.hero, title: e.target.value } })} className={input} />
        </label>
        <label className="mt-2 block text-sm">النص التعريفي
          <textarea rows={3} value={h.hero.subtitle} onChange={(e) => upd({ hero: { ...h.hero, subtitle: e.target.value } })} className={input} />
        </label>
        <label className="mt-2 block text-sm">نص الزر
          <input value={h.hero.button} onChange={(e) => upd({ hero: { ...h.hero, button: e.target.value } })} className={input} />
        </label>
        <label className="mt-2 block text-sm">صورة الواجهة
          <input type="file" accept="image/*" className={input} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const path = `home/${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
            const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
            if (error) { toast.error(error.message); return; }
            upd({ hero: { ...h.hero, image: supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl } });
            toast.success("تم رفع الصورة");
          }} />
        </label>
        {h.hero.image && (
          <div className="mt-2 flex items-center gap-3">
            <img src={h.hero.image} alt="" className="h-16 w-28 rounded-lg object-cover" />
            <button type="button" onClick={() => upd({ hero: { ...h.hero, image: "" } })} className="text-sm underline">استعادة الصورة الافتراضية</button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-secondary p-5">
        <div className="font-bold">منتجات مميزة ({h.featured.length})</div>
        <p className="text-xs text-muted-foreground">تظهر في قسم «منتجات مميزة» أعلى المتجر بترتيب اختيارك.</p>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ابحث عن منتج" className={`${input} mt-2`} />
        <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
          {shown.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={h.featured.includes(p.id)} onChange={(e) => upd({ featured: e.target.checked ? [...h.featured, p.id] : h.featured.filter((x) => x !== p.id) })} />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={h.previous} onChange={(e) => upd({ previous: e.target.checked })} /> اقتراح «اشتريتَ سابقاً» للزبون المفعّل عند فتح المتجر</label>

      <button
        onClick={async () => {
          const { error } = await supabase.from("shop_config").upsert({ key: "home", value: h as never });
          if (error) { toast.error(error.message); return; }
          toast.success("تم حفظ الصفحة الرئيسية"); setDraft(null); qc.invalidateQueries({ queryKey: ["shop_config"] });
        }}
        className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground"
      >حفظ التعديلات</button>
    </section>
  );
}
