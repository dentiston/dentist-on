import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, Copy, Download, LogOut, MessageCircle, Phone, RefreshCw, Search, Share2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/db";
import { fmt } from "@/lib/products";
import { refLink } from "@/lib/referral";
import { toCsv } from "@/lib/csv";
import { waLinkTo } from "@/lib/store";
import { supportLink } from "@/lib/contacts";
import { clearInvite, doctorInviteMessage, readInvite, rememberInvite, useMyPortal, usePortalDoctors, usePortalOrders, type PortalDoctor } from "@/lib/distributor";

export const Route = createFileRoute("/distributor")({
  head: () => ({
    meta: [
      { title: "بوابة الموزع | Dentist On" },
      { name: "description", content: "بوابة الموزعين في Dentist On: أطباؤك وطلباتهم ومبيعاتهم." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ invite: typeof s["invite"] === "string" ? s["invite"] : undefined }),
  component: DistributorPage,
});

const input = "w-full rounded-xl border border-input bg-card px-3 py-2";
const DOC_STATUS: Record<string, string> = { approved: "مفعّل", pending: "بانتظار الموافقة", rejected: "مرفوض" };
const DAY = 864e5;

function useSession() {
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, x) => setS(x));
    supabase.auth.getSession().then(({ data }) => setS(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  return s;
}

function DistributorPage() {
  const session = useSession();
  const { invite } = Route.useSearch();
  // مفتاح الدعوة يُحفظ لأن تأكيد البريد قد يفتح الصفحة من جديد
  useEffect(() => { if (invite) rememberInvite(invite); }, [invite]);
  if (session === undefined) return <main className="py-20 text-center text-muted-foreground">جارِ التحميل…</main>;
  if (!session) return <Login invite={invite || readInvite()} />;
  return <Portal session={session} />;
}

// دخول فقط. إنشاء الحساب يظهر حصراً لمن معه رابط دعوة من الإدارة.
function Login({ invite }: { invite: string }) {
  const [mode, setMode] = useState<"in" | "up">(invite ? "up" : "in");
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-center text-3xl font-black">بوابة الموزع</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">أطباؤك وطلباتهم ومبيعاتهم في مكان واحد.</p>
      {invite && mode === "up" && <p className="mt-4 rounded-2xl bg-secondary p-3 text-center text-sm">لديك دعوة من الإدارة. أنشئ حسابك لتفعيل بوابتك.</p>}
      <form className="mt-6 space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const email = String(f.get("email")).trim(), password = String(f.get("password"));
        setBusy(true);
        const { data, error } = mode === "in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/distributor?invite=${encodeURIComponent(invite)}` } });
        setBusy(false);
        if (error) { toast.error(error.message); return; }
        if (mode === "up" && !data.session) toast.success("تحقق من بريدك الإلكتروني لتأكيد الحساب ثم افتح الرابط");
      }}>
        <input name="email" type="email" required placeholder="البريد الإلكتروني" className={input} dir="ltr" />
        <input name="password" type="password" required minLength={6} placeholder="كلمة المرور" className={input} dir="ltr" />
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition active:scale-[.98] disabled:opacity-60">{mode === "in" ? "تسجيل الدخول" : "إنشاء حسابي"}</button>
      </form>
      {invite && (
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm text-muted-foreground underline">
          {mode === "in" ? "حسابي غير مُنشأ بعد (لدي دعوة)" : "لدي حساب، تسجيل الدخول"}
        </button>
      )}
      {!invite && <p className="mt-6 rounded-2xl bg-secondary p-3 text-center text-xs text-muted-foreground">الدخول للموزعين فقط. الحساب يُفتح عبر رابط دعوة ترسله الإدارة.</p>}
    </main>
  );
}

type Tab = "doctors" | "orders" | "performance";

function Portal({ session }: { session: Session }) {
  const qc = useQueryClient();
  const { data: me, isLoading } = useMyPortal(true);
  const [claiming, setClaiming] = useState(false);
  const [claimErr, setClaimErr] = useState("");
  // دعوة محفوظة: نفعّلها مرة واحدة بعد الدخول
  useEffect(() => {
    const t = readInvite();
    if (!t || isLoading || me) return;
    let off = false;
    setClaiming(true);
    (async () => {
      const { data, error } = await sb.rpc("claim_distributor_invite", { p_token: t });
      if (off) return;
      clearInvite();
      setClaiming(false);
      if (error) setClaimErr(error.message.includes("is_customer") ? "هذا الحساب مسجّل كطبيب ولا يمكن تحويله إلى موزع. استخدم بريداً آخر." : error.message.includes("is_admin") ? "حساب الإدارة لا يُستخدم كموزع." : error.message);
      else if (!data) setClaimErr("رابط الدعوة غير صالح أو منتهٍ أو مستعمل. اطلب رابطاً جديداً من الإدارة.");
      else { toast.success("تم تفعيل بوابتك"); qc.invalidateQueries(); }
    })();
    return () => { off = true; };
  }, [isLoading, me, qc]);
  const ok = !!me?.active;
  const { data: doctors = [] } = usePortalDoctors(ok);
  const { data: orders = [] } = usePortalOrders(ok);
  const [tab, setTab] = useState<Tab>("doctors");
  const [spin, setSpin] = useState(false);
  const out = () => supabase.auth.signOut();

  if (isLoading || claiming) return <main className="py-20 text-center text-muted-foreground">جارِ التحميل…</main>;
  if (!me) return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-accent" />
      <h1 className="mt-3 text-2xl font-black">هذا الحساب ليس حساب موزع</h1>
      <p className="mt-2 text-sm text-muted-foreground">{claimErr || "تُفتح بوابة الموزع عبر رابط دعوة تولّده الإدارة فقط. اطلب رابطك منهم."}</p>
      <div className="mt-2 text-sm font-bold" dir="ltr">{session.user.email}</div>
      <a href={supportLink()} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 font-bold text-black"><MessageCircle className="h-4 w-4" /> راسل الإدارة عبر واتساب</a>
      <div className="mt-4 flex justify-center gap-3 text-sm">
        <button onClick={() => qc.invalidateQueries({ queryKey: ["portal-info"] })} className="rounded-full bg-muted px-4 py-2">تحديث</button>
        <button onClick={out} className="rounded-full bg-muted px-4 py-2">تسجيل الخروج</button>
      </div>
    </main>
  );
  if (!me.active) return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-black">حساب الموزع موقوف حالياً</h1>
      <p className="mt-2 text-sm text-muted-foreground">تواصل مع الإدارة لإعادة التفعيل.</p>
      <button onClick={out} className="mt-5 rounded-full bg-muted px-5 py-2 text-sm">تسجيل الخروج</button>
    </main>
  );

  const link = refLink(me.code);
  const active = doctors.filter((d) => d.status === "approved").length;
  const live = orders.filter((o) => o.status !== "ملغي");
  const sales = live.reduce((s, o) => s + o.total, 0);
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast.success("تم نسخ رابط الإحالة"); } catch { toast.error("تعذّر النسخ"); } };
  const share = async () => {
    const text = doctorInviteMessage(link);
    if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* ألغى المستخدم */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };
  const refresh = async () => { setSpin(true); await qc.invalidateQueries(); setTimeout(() => setSpin(false), 500); };
  const kpi = (label: string, value: string, sub?: string) => (
    <div className="rounded-2xl bg-secondary p-3 sm:p-4"><div className="text-xs text-muted-foreground sm:text-sm">{label}</div><div className="text-xl font-black sm:text-2xl">{value}</div>{sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}</div>
  );
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1"><div className="text-xs font-bold text-accent">بوابة الموزع</div><h1 className="truncate text-2xl font-black">{me.name}</h1></div>
        <button onClick={refresh} aria-label="تحديث" className="grid h-10 w-10 place-items-center rounded-full bg-muted transition active:scale-95"><RefreshCw className={`h-4 w-4 ${spin ? "animate-spin" : ""}`} /></button>
        <button onClick={out} aria-label="خروج" className="grid h-10 w-10 place-items-center rounded-full bg-muted transition active:scale-95"><LogOut className="h-4 w-4" /></button>
      </div>

      <section className="rounded-3xl bg-primary p-4 text-primary-foreground">
        <div className="text-sm opacity-80">رابط الإحالة الخاص بك · الكود <b dir="ltr">{me.code}</b></div>
        <div className="mt-2 break-all rounded-xl bg-white/10 px-3 py-2 text-xs" dir="ltr">{link}</div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
          <button onClick={copy} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-black transition active:scale-95"><Copy className="h-4 w-4" /> نسخ</button>
          <button onClick={share} className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-accent-foreground transition active:scale-95"><Share2 className="h-4 w-4" /> مشاركة مع طبيب</button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpi("الأطباء", String(doctors.length), `${active} مفعّل`)}
        {kpi("الطلبات", String(live.length))}
        {kpi("المبيعات", fmt(sales))}
        {kpi("متوسط الطلب", fmt(live.length ? sales / live.length : 0))}
      </section>

      <div className="flex gap-2 rounded-full bg-muted p-1 text-sm font-bold" role="tablist">
        {([["doctors", "الأطباء"], ["orders", "الطلبات"], ["performance", "الأداء"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 transition ${tab === k ? "bg-primary text-primary-foreground shadow" : ""}`}>{l}</button>
        ))}
      </div>
      <div key={tab} className="admin-view">
        {tab === "doctors" && <Doctors list={doctors} />}
        {tab === "orders" && <Orders list={orders} />}
        {tab === "performance" && <Performance orders={live} doctors={doctors} />}
      </div>
    </main>
  );
}

function Doctors({ list }: { list: PortalDoctor[] }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "approved" | "pending" | "follow">("all");
  const [sort, setSort] = useState<"total" | "new" | "old">("total");
  const stale = (d: PortalDoctor) => d.status === "approved" && (!d.last_order || Date.now() - new Date(d.last_order).getTime() > 30 * DAY);
  const nq = q.trim().toLowerCase();
  const shown = list
    .filter((d) => (f === "all" || (f === "follow" ? stale(d) : d.status === f)) && (!nq || d.clinic_name.toLowerCase().includes(nq) || d.phone.includes(nq)))
    .sort((a, b) => sort === "total" ? b.orders_total - a.orders_total : sort === "new" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at));
  const chip = (k: typeof f, l: string, n: number) => (
    <button key={k} onClick={() => setF(k)} aria-pressed={f === k} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold transition active:scale-95 ${f === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{l} <span className="opacity-70">{n}</span></button>
  );
  const exportCsv = () => {
    const rows = [["العيادة", "الهاتف", "الحالة", "عدد الطلبات", "إجمالي المشتريات", "آخر طلب"], ...shown.map((d) => [d.clinic_name, d.phone, DOC_STATUS[d.status] ?? d.status, String(d.orders_count), String(d.orders_total), d.last_order ? new Date(d.last_order).toLocaleDateString("en-GB") : ""])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    a.download = "my-doctors.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم العيادة أو الهاتف" className={`${input} pr-9`} /></div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="الترتيب" className={`${input} sm:w-44`}>
          <option value="total">الأكثر شراءً</option><option value="new">الأحدث تسجيلاً</option><option value="old">الأقدم تسجيلاً</option>
        </select>
        <button onClick={exportCsv} className="flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold transition active:scale-95"><Download className="h-4 w-4" /> إكسل</button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chip("all", "الكل", list.length)}
        {chip("approved", "مفعّل", list.filter((d) => d.status === "approved").length)}
        {chip("pending", "بانتظار الموافقة", list.filter((d) => d.status === "pending").length)}
        {chip("follow", "يحتاج متابعة", list.filter(stale).length)}
      </div>
      {list.length === 0 && <p className="py-10 text-center text-muted-foreground">لا يوجد أطباء بعد. شارك رابط الإحالة ليسجّل أطباؤك منه.</p>}
      {list.length > 0 && shown.length === 0 && <p className="py-8 text-center text-muted-foreground">لا نتائج</p>}
      <ul className="space-y-2">
        {shown.map((d) => (
          <li key={d.user_id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{d.clinic_name || "عيادة"}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">{d.phone}</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${d.status === "approved" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{DOC_STATUS[d.status] ?? d.status}</span>
              {stale(d) && <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-bold text-destructive">يحتاج متابعة</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span><b>{d.orders_count}</b> طلب</span>
              <span><b>{fmt(d.orders_total)}</b></span>
              <span className="text-xs text-muted-foreground">{d.last_order ? `آخر طلب ${new Date(d.last_order).toLocaleDateString("ar")}` : "لم يطلب بعد"}</span>
              <span className="mr-auto flex gap-2">
                <a href={waLinkTo(d.phone, `مرحباً دكتور ${d.clinic_name || ""}، معك موزعك من Dentist On. كيف أخدمك؟`)} target="_blank" rel="noreferrer" aria-label="واتساب" className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-black transition active:scale-90"><MessageCircle className="h-4 w-4" /></a>
                <a href={`tel:${d.phone}`} aria-label="اتصال" className="grid h-8 w-8 place-items-center rounded-full bg-muted transition active:scale-90"><Phone className="h-4 w-4" /></a>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Orders({ list }: { list: { id: string; created_at: string; clinic_name: string; total: number; status: string }[] }) {
  const [f, setF] = useState("الكل");
  const statuses = ["الكل", ...new Set(list.map((o) => o.status))];
  const shown = list.filter((o) => f === "الكل" || o.status === f);
  return (
    <section className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((s) => (
          <button key={s} onClick={() => setF(s)} aria-pressed={f === s} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold transition active:scale-95 ${f === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s} <span className="opacity-70">{s === "الكل" ? list.length : list.filter((o) => o.status === s).length}</span></button>
        ))}
      </div>
      {shown.length === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد طلبات</p>}
      <ul className="space-y-2">
        {shown.map((o) => (
          <li key={o.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{o.clinic_name}</div>
              <div className="text-xs text-muted-foreground"><span dir="ltr">#{o.id.slice(0, 8).toUpperCase()}</span> · {new Date(o.created_at).toLocaleDateString("ar")}</div>
            </div>
            <b>{fmt(o.total)}</b>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold">{o.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Performance({ orders, doctors }: { orders: { created_at: string; total: number }[]; doctors: PortalDoctor[] }) {
  const months = useMemo(() => Array.from({ length: 6 }, (_, k) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - k));
    const sum = orders.filter((o) => { const x = new Date(o.created_at); return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear(); }).reduce((s, o) => s + o.total, 0);
    return { label: d.toLocaleDateString("ar", { month: "short" }), total: Math.round(sum * 100) / 100 };
  }), [orders]);
  const top = [...doctors].sort((a, b) => b.orders_total - a.orders_total).filter((d) => d.orders_total > 0).slice(0, 5);
  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-secondary p-4">
        <div className="text-sm text-muted-foreground">المبيعات الشهرية (آخر 6 أشهر)</div>
        <div className="mt-2 h-48 w-full text-primary" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} width={40} />
              <Tooltip formatter={(v) => [fmt(Number(v)), "المبيعات"]} />
              <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-black"><Trophy className="h-4 w-4 text-accent" /> أفضل أطبائك</h2>
        {top.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">لا مشتريات بعد</p>}
        <ol className="mt-3 space-y-2">
          {top.map((d, k) => (
            <li key={d.user_id} className="flex items-center gap-3 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-black text-accent-foreground">{k + 1}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{d.clinic_name}</span>
              <span className="text-xs text-muted-foreground">{d.orders_count} طلب</span>
              <b>{fmt(d.orders_total)}</b>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
