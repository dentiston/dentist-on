import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { GraduationCap, Headset, PackagePlus, Recycle, Sparkles, Wrench, X, MessageCircle, Phone } from "lucide-react";
import { useCustomer } from "@/lib/customer";
import { useProducts } from "@/lib/products";
import { isBundle } from "@/lib/bundles";
import { ORDERS_PHONE, SUPPORT_PHONE, ordersLink, supportLink } from "@/lib/contacts";
import { ServiceRequestDialog, type Kind } from "@/components/ServiceRequests";

export const openHub = () => window.dispatchEvent(new Event("hub:open"));

// مفتاح كهرباء على حافة الشاشة (كمفتاح شاشة البداية): اسحبه أو اضغطه فتضيء لوحة الأقسام.
export function SideHub() {
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState<Kind | null>(null);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { customer } = useCustomer();
  const { data: products = [] } = useProducts();
  const bundles = products.filter((p) => p.active && isBundle(p)).length;
  const handle = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number; from: "edge" | "panel" } | null>(null);
  const who = customer?.clinic_name;

  const close = useCallback(() => { setOpen(false); handle.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("hub:open", on);
    return () => window.removeEventListener("hub:open", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [open, close]);
  // سحب من حافة الشاشة اليمنى لفتح اللوحة
  useEffect(() => {
    const start = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t || open) return;
      if (window.innerWidth - t.clientX <= 18) touch.current = { x: t.clientX, y: t.clientY, from: "edge" };
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0]; const s = touch.current; if (!t || !s || s.from !== "edge") return;
      if (s.x - t.clientX > 50 && Math.abs(t.clientY - s.y) < 60) { touch.current = null; setOpen(true); }
    };
    const end = () => { if (touch.current?.from === "edge") touch.current = null; };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    return () => { window.removeEventListener("touchstart", start); window.removeEventListener("touchmove", move); window.removeEventListener("touchend", end); };
  }, [open]);

  if (path.startsWith("/admin")) return null;

  return (
    <>
      {/* المفتاح على الحافة */}
      <button
        ref={handle} type="button" onClick={() => setOpen(true)} aria-label="فتح أقسام Dentist On" aria-expanded={open}
        className={`hub-switch ${open ? "is-open" : ""}`}
      >
        <span className="hub-switch-track"><span className="hub-switch-knob" /></span>
        <span className="hub-switch-label">الأقسام</span>
      </button>

      <div className={`hub-overlay ${open ? "is-open" : ""}`} onClick={close} aria-hidden={!open} />
      <aside
        role="dialog" aria-modal="true" aria-label="أقسام Dentist On" aria-hidden={!open} dir="rtl"
        className={`hub-panel ${open ? "is-open" : ""}`}
        onTouchStart={(e) => { const t = e.touches[0]; if (t) touch.current = { x: t.clientX, y: t.clientY, from: "panel" }; }}
        onTouchEnd={(e) => {
          const s = touch.current; const t = e.changedTouches[0]; touch.current = null;
          if (s?.from === "panel" && t && t.clientX - s.x > 80 && Math.abs(t.clientY - s.y) < 60) close();
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-accent">Dentist On</div>
            <h2 className="text-2xl font-black leading-tight">كل ما يلزم طبيب الأسنان</h2>
          </div>
          <button ref={closeBtn} type="button" onClick={close} aria-label="إغلاق" className="grid h-10 w-10 place-items-center rounded-full bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Tile close={close} n={0} wide tall to="/offers">
            <span className="hub-ico"><Sparkles className="h-5 w-5" /></span>
            <span className="mt-3 block text-lg font-black">العروض والبكجات</span>
            <span className="mt-1 block text-xs text-muted-foreground">باقات جاهزة بأسعار مخفّضة، مثالية لطلاب الجامعات والعيادات الجديدة.</span>
            <span className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-accent-foreground"><GraduationCap className="h-3 w-3" /> للطلاب</span>
              {bundles > 0 && <span className="rounded-full bg-muted px-2 py-0.5">{bundles} باقة</span>}
            </span>
          </Tile>
          <Tile close={close} n={1} to="/used">
            <span className="hub-ico"><Recycle className="h-5 w-5" /></span>
            <span className="mt-3 block font-black">الأدوات المستعملة</span>
            <span className="mt-1 block text-xs text-muted-foreground">اعرض أدواتك أو اشترِ بسعر أقل.</span>
          </Tile>
          <Tile close={close} n={2} to="/cart" hash="extras">
            <span className="hub-ico"><PackagePlus className="h-5 w-5" /></span>
            <span className="mt-3 block font-black">طلبات إضافية</span>
            <span className="mt-1 block text-xs text-muted-foreground">مواد من خارج المتجر نوصلها لك.</span>
          </Tile>
          <Tile close={close} n={3} wide onClick={() => setDlg("maintenance")}>
            <span className="flex items-center gap-3">
              <span className="hub-ico"><Wrench className="h-5 w-5" /></span>
              <span>
                <span className="block font-black">الصيانة</span>
                <span className="block text-xs text-muted-foreground">صيانة القبضات والأجهزة والمعدات، اطلبها بضغطة.</span>
              </span>
            </span>
          </Tile>
        </div>

        <div className="hub-rise mt-6" style={idx(4)}>
          <div className="mb-2 flex items-center gap-2 text-sm font-black"><Headset className="h-4 w-4" /> تواصل مباشر عبر واتساب</div>
          <div className="space-y-2">
            <WaButton href={supportLink(who)} title="الشكاوى والدعم" phone={SUPPORT_PHONE} />
            <WaButton href={ordersLink("طلب مباشر / متابعة طلب / طلب صيانة", who)} title="طلب مباشر · متابعة الطلب · الصيانة" phone={ORDERS_PHONE} />
          </div>
        </div>
      </aside>

      <ServiceRequestDialog kind={dlg ?? "maintenance"} open={dlg !== null} onOpenChange={(o) => { if (!o) setDlg(null); }} />
    </>
  );
}

type TileProps = { n: number; wide?: boolean; tall?: boolean; children: ReactNode; to?: "/offers" | "/used" | "/cart"; hash?: string; onClick?: () => void; close: () => void };
const idx = (n: number): CSSProperties => ({ ["--i" as string]: n });
const spotlight = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};
function Tile({ n, wide, tall, children, to, hash, onClick, close }: TileProps) {
  const cls = `hub-tile ${wide ? "col-span-2" : ""} ${tall ? "min-h-[150px]" : "min-h-[118px]"}`;
  if (to) return <Link to={to} {...(hash ? { hash } : {})} onClick={close} onPointerMove={spotlight} style={idx(n)} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} onPointerMove={spotlight} style={idx(n)} className={`${cls} text-start`}>{children}</button>;
}

function WaButton({ href, title, phone }: { href: string; title: string; phone: string }) {
  return (
    <div className="flex items-stretch gap-2">
      <a href={href} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-3 rounded-2xl bg-[#25D366] px-4 py-3 text-black transition active:scale-[.98]">
        <MessageCircle className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black leading-tight">{title}</span>
          <span className="block text-xs font-bold opacity-80" dir="ltr">{phone}</span>
        </span>
      </a>
      <a href={`tel:${phone}`} aria-label={`اتصال ${phone}`} className="grid w-12 place-items-center rounded-2xl bg-muted"><Phone className="h-4 w-4" /></a>
    </div>
  );
}
