import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoLoader } from "@/components/LogoLoader";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/lib/customer";
import { fmt } from "@/lib/products";
import { PHONE_PATTERN } from "@/lib/store";
import { MyRequests } from "@/components/AskMaterial";
import { WatchAvailable } from "@/components/WatchAvailable";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "حسابي | Dentist On" },
      { name: "description", content: "سجّل حساب عيادتك في Dentist On وتابع طلباتك." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

const input = "w-full rounded-xl border border-input bg-card px-3 py-2";

function AccountPage() {
  const { session, customer, loading, reload } = useCustomer();
  if (loading) return <main><LogoLoader /></main>;
  if (!session) return <Auth />;
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">{customer?.clinic_name || "حسابي"}</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted-foreground underline">تسجيل الخروج</button>
      </div>
      {!customer ? (
        <p className="mt-6 rounded-2xl bg-secondary p-4">هذا الحساب غير مسجّل كحساب زبون. <Link to="/admin" className="font-bold underline">لوحة المدير</Link></p>
      ) : (
        <>
          <Status status={customer.status} onRefresh={reload} />
          {customer.status === "approved" && <><WatchAvailable /><Orders /><MyRequests /></>}
        </>
      )}
    </main>
  );
}

function Status({ status, onRefresh }: { status: string; onRefresh: () => void }) {
  if (status === "approved")
    return <p className="mt-6 rounded-2xl bg-secondary p-4 font-bold">حسابك مفعّل. <Link to="/cart" className="text-primary underline">أكمل طلبك من السلة</Link></p>;
  if (status === "rejected")
    return <p className="mt-6 rounded-2xl bg-secondary p-4 text-destructive">تعذّر قبول حسابك. تواصل معنا لمعرفة السبب.</p>;
  return (
    <div className="mt-6 rounded-2xl bg-secondary p-4">
      <div className="font-bold">حسابك قيد المراجعة</div>
      <p className="mt-1 text-sm text-muted-foreground">جهّز سلتك الآن؛ سنراسلك على واتساب فور الموافقة لتكمل الطلب.</p>
      <div className="mt-3 flex gap-2">
        <Link to="/" className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">تابع التسوق</Link>
        <button onClick={onRefresh} className="rounded-full bg-muted px-5 py-2 text-sm">تحديث الحالة</button>
      </div>
    </div>
  );
}

function Orders() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,status,total,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <section className="mt-8">
      <h2 className="text-xl font-black">طلباتي</h2>
      {isLoading && <p className="mt-3 text-muted-foreground">جارِ التحميل…</p>}
      {!isLoading && data.length === 0 && <p className="mt-3 text-muted-foreground">لا توجد طلبات بعد.</p>}
      <div className="mt-3 space-y-2">
        {data.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <div>
              <b dir="ltr">{o.id.slice(0, 8).toUpperCase()}</b>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ar")}</div>
            </div>
            <div className="text-left"><div className="font-black">{fmt(Number(o.total))}</div><div className="text-sm">{o.status}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Auth() {
  const [mode, setMode] = useState<"in" | "up">("up");
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-center text-3xl font-black">{mode === "up" ? "تسجيل عيادة جديدة" : "تسجيل الدخول"}</h1>
      {mode === "up" && <p className="mt-2 text-center text-sm text-muted-foreground">بعد التسجيل تراجع الإدارة حسابك. يمكنك تجهيز السلة خلال ذلك.</p>}
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const email = String(f.get("email")), password = String(f.get("password"));
          if (mode === "up") {
            if (String(f.get("website") ?? "") !== "") return; // فخ للروبوتات
            if (Date.now() - Number(localStorage.getItem("signup-at") ?? 0) < 60_000) { toast.error("انتظر دقيقة قبل المحاولة مجدداً"); return; }
          }
          setBusy(true);
          const { data, error } = mode === "in"
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({
                email, password,
                options: {
                  emailRedirectTo: `${window.location.origin}/account`,
                  data: { clinic_name: String(f.get("clinic_name")), phone: String(f.get("phone")), address: String(f.get("address")) },
                },
              });
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          if (mode === "up") localStorage.setItem("signup-at", String(Date.now()));
          if (mode === "up" && !data.session) toast.success("تحقق من بريدك الإلكتروني لتأكيد الحساب");
        }}
      >
        {mode === "up" && (
          <>
            <input name="clinic_name" required placeholder="اسم العيادة / الطبيب" className={input} />
            <input name="phone" required type="tel" pattern={PHONE_PATTERN} title="أرقام لاتينية فقط، مثال 0944123456" placeholder="رقم الهاتف (واتساب)" className={input} dir="ltr" />
            <input name="address" required placeholder="العنوان" className={input} />
          </>
        )}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <input name="email" type="email" required placeholder="البريد الإلكتروني" className={input} dir="ltr" />
        <input name="password" type="password" required minLength={6} placeholder="كلمة المرور" className={input} dir="ltr" />
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">
          {mode === "up" ? "إرسال طلب التسجيل" : "دخول"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "up" ? "in" : "up")} className="mt-4 w-full text-sm text-muted-foreground underline">
        {mode === "up" ? "لديك حساب؟ سجّل الدخول" : "ليس لديك حساب؟ سجّل عيادتك"}
      </button>
    </main>
  );
}
