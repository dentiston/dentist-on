import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight, BarChart3, Bell, Boxes, ChevronDown, Gift, Home, LayoutDashboard, LayoutGrid, LogOut, Maximize2, Menu, Moon, PackageSearch,
  PanelRight, PanelRightClose, PanelRightOpen, Percent, Pin, Receipt, Recycle, RefreshCw, Search, Settings, ShoppingBasket, Star,
  Sun, Truck, Users, UsersRound, Wrench, X, type LucideIcon,
} from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { useDark } from "@/lib/theme";

type Item = { id: string; label: string; icon: LucideIcon; group: string; hint: string };
export const NAV: Item[] = [
  { id: "hub", label: "مركز التحكم", icon: LayoutGrid, group: "الرئيسية", hint: "كل أقسام المتجر كبطاقات، رتّبها كما تشاء" },
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard, group: "الرئيسية", hint: "ملخص اليوم والمبيعات والتنبيهات" },
  { id: "orders", label: "الطلبات", icon: Receipt, group: "المبيعات", hint: "كل الطلبات وحالاتها والفواتير" },
  { id: "carts", label: "سلال متروكة", icon: ShoppingBasket, group: "المبيعات", hint: "سلات لم تُرسل، تواصل مع العيادة" },
  { id: "promos", label: "الخصومات", icon: Percent, group: "المبيعات", hint: "كوبونات وخصومات تلقائية" },
  { id: "bundles", label: "العروض والبكجات", icon: Gift, group: "المبيعات", hint: "باقات جاهزة بأسعار مخفّضة" },
  { id: "products", label: "المنتجات", icon: Boxes, group: "الكتالوج", hint: "إضافة وتعديل المنتجات والمخزون" },
  { id: "requests", label: "طلبات التوفر", icon: PackageSearch, group: "الكتالوج", hint: "مواد يسأل عنها الزبائن" },
  { id: "distributors", label: "الموزعون", icon: Truck, group: "الكتالوج", hint: "الموزعون وتوزيع العملاء" },
  { id: "used", label: "المستعمل", icon: Recycle, group: "الكتالوج", hint: "أدوات مستعملة بانتظار الموافقة" },
  { id: "customers", label: "العملاء", icon: Users, group: "العملاء", hint: "الموافقة على الحسابات والخصومات" },
  { id: "services", label: "طلبات إضافية وصيانة", icon: Wrench, group: "العملاء", hint: "مواد من خارج المتجر وطلبات الصيانة" },
  { id: "reviews", label: "التقييمات", icon: Star, group: "العملاء", hint: "مراجعة تقييمات المنتجات" },
  { id: "home", label: "الصفحة الرئيسية", icon: Home, group: "المتجر", hint: "الإعلان والبانر والمنتجات المميزة" },
  { id: "rate", label: "الإعدادات", icon: Settings, group: "المتجر", hint: "سعر الصرف والتوصيل والحد الأدنى" },
  { id: "team", label: "الفريق والسجل", icon: UsersRound, group: "المتجر", hint: "الموظفون وصلاحياتهم وسجل العمليات" },
];
const byId = (id: string) => NAV.find((n) => n.id === id);

type Prefs = { pins: string[]; collapsed: boolean; closed: string[]; wide: boolean; sidebar: boolean };
const KEY = "dentist-on-admin-prefs";
const DEFAULT: Prefs = { pins: [], collapsed: false, closed: [], wide: false, sidebar: false };
function usePrefs() {
  const [p, setP] = useState<Prefs>(DEFAULT);
  useEffect(() => {
    try { setP({ ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}") }); } catch { /* افتراضي */ }
  }, []);
  const update = useCallback((patch: Partial<Prefs> | ((v: Prefs) => Partial<Prefs>)) => {
    setP((v) => {
      const n = { ...v, ...(typeof patch === "function" ? patch(v) : patch) };
      try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* تجاهل */ }
      return n;
    });
  }, []);
  return [p, update] as const;
}

export type AdminShellProps = {
  items: string[]; tab: string; go: (t: string) => void; badges: Record<string, number>;
  email: string; onSignOut: () => void; onRefresh: () => Promise<unknown> | void; children: ReactNode;
};

export function AdminShell({ items, tab, go, badges, email, onSignOut, onRefresh, children }: AdminShellProps) {
  const [prefs, setPrefs] = usePrefs();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [spin, setSpin] = useState(false);
  const { dark, toggle } = useDark();
  const visible = useMemo(() => NAV.filter((n) => items.includes(n.id)), [items]);
  const totalAlerts = visible.reduce((s, n) => s + (n.id === "carts" ? 0 : badges[n.id] ?? 0), 0);
  const cur = byId(tab);

  const refresh = async () => { setSpin(true); try { await onRefresh(); } finally { setTimeout(() => setSpin(false), 500); } };
  const pick = (id: string) => { go(id); setDrawer(false); setPalette(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // اختصارات: Ctrl/⌘+K أو «/» للبحث السريع، Alt+رقم للانتقال
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); return; }
      if (e.key === "/" && !typing(e.target)) { e.preventDefault(); setPalette(true); return; }
      if (e.altKey && /^[1-9]$/.test(e.key)) { const n = visible[Number(e.key) - 1]; if (n) { e.preventDefault(); pick(n.id); } }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  useEffect(() => {
    if (!drawer) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [drawer]);

  const togglePin = (id: string) => setPrefs((v) => ({ pins: v.pins.includes(id) ? v.pins.filter((x) => x !== id) : [...v.pins, id] }));
  const toggleGroup = (g: string) => setPrefs((v) => ({ closed: v.closed.includes(g) ? v.closed.filter((x) => x !== g) : [...v.closed, g] }));

  const navBody = (compact: boolean) => {
    const pinned = prefs.pins.map(byId).filter((n): n is Item => !!n && items.includes(n.id));
    const groups = [...new Set(visible.map((n) => n.group))];
    const row = (n: Item) => {
      const active = tab === n.id;
      const count = badges[n.id] ?? 0;
      const Icon = n.icon;
      return (
        <div key={n.id} className="group/row relative">
          <button
            type="button" onClick={() => pick(n.id)} title={compact ? n.label : n.hint} aria-current={active ? "page" : undefined}
            className={`admin-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${active ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted"} ${compact ? "justify-center px-0" : ""}`}
          >
            <span className="relative"><Icon className="h-[18px] w-[18px]" />{compact && count > 0 && <span className="admin-pulse absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent" />}</span>
            {!compact && <span className="flex-1 truncate text-start">{n.label}</span>}
            {!compact && count > 0 && <span className="admin-pulse rounded-full bg-accent px-2 text-xs font-black text-accent-foreground">{count}</span>}
          </button>
          {!compact && n.id !== "overview" && (
            <button
              type="button" onClick={() => togglePin(n.id)} aria-label={prefs.pins.includes(n.id) ? `إزالة ${n.label} من المفضلة` : `تثبيت ${n.label}`}
              className={`absolute ${count > 0 ? "left-10" : "left-1"} top-1/2 -translate-y-1/2 rounded-md p-1 transition ${prefs.pins.includes(n.id) ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-60"} ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Pin className={`h-3.5 w-3.5 ${prefs.pins.includes(n.id) ? "fill-current" : ""}`} />
            </button>
          )}
        </div>
      );
    };
    return (
      <nav className="space-y-4" aria-label="أقسام لوحة المدير">
        {pinned.length > 0 && (
          <div>
            {!compact && <div className="mb-1 flex items-center gap-1 px-3 text-[11px] font-black text-muted-foreground"><Pin className="h-3 w-3" /> المفضلة</div>}
            <div className="space-y-1">{pinned.map(row)}</div>
          </div>
        )}
        {groups.map((g) => {
          const closed = !compact && prefs.closed.includes(g);
          const list = visible.filter((n) => n.group === g);
          const hidden = list.reduce((s, n) => s + (badges[n.id] ?? 0), 0);
          return (
            <div key={g}>
              {!compact && list.length > 1 || (!compact && g !== "الرئيسية") ? (
                <button type="button" onClick={() => toggleGroup(g)} aria-expanded={!closed} className="mb-1 flex w-full items-center justify-between px-3 text-[11px] font-black text-muted-foreground hover:text-foreground">
                  <span>{g}</span>
                  <span className="flex items-center gap-1">{closed && hidden > 0 && <span className="admin-pulse rounded-full bg-accent px-1.5 text-accent-foreground">{hidden}</span>}<ChevronDown className={`h-3.5 w-3.5 transition ${closed ? "-rotate-90" : ""}`} /></span>
                </button>
              ) : compact && g !== "الرئيسية" ? <div className="mx-3 mb-1 border-t border-border" /> : null}
              {!closed && <div className="space-y-1">{list.map(row)}</div>}
            </div>
          );
        })}
      </nav>
    );
  };

  const iconBtn = "grid h-10 w-10 place-items-center rounded-full bg-muted transition hover:bg-secondary active:scale-95";
  return (
    <div className={`mx-auto flex gap-5 px-3 py-5 sm:px-4 ${prefs.wide ? "max-w-[1700px]" : "max-w-7xl"}`}>
      {/* الشريط الجانبي (حاسوب) */}
      <aside className={`hidden shrink-0 transition-[width] duration-300 ${prefs.sidebar ? "lg:block" : ""} ${prefs.collapsed ? "w-16" : "w-64"}`}>
        <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-3xl border border-border bg-card p-3">
          {navBody(prefs.collapsed)}
          <button type="button" onClick={() => setPrefs((v) => ({ collapsed: !v.collapsed }))} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold text-muted-foreground hover:bg-muted" aria-label={prefs.collapsed ? "توسيع الشريط" : "طيّ الشريط"}>
            {prefs.collapsed ? <PanelRightOpen className="h-4 w-4" /> : <><PanelRightClose className="h-4 w-4" /> طيّ الشريط</>}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* الشريط العلوي */}
        <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border bg-card p-2 pr-3">
          <button type="button" onClick={() => setDrawer(true)} aria-label="الأقسام" className={`${iconBtn} lg:hidden`}><Menu className="h-5 w-5" /></button>
          {tab !== "hub" && items.includes("hub") && (
            <button type="button" onClick={() => pick("hub")} className="flex h-10 items-center gap-1 rounded-full bg-muted px-3 text-sm font-bold transition hover:bg-secondary active:scale-95"><ArrowRight className="h-4 w-4" /><span className="hidden sm:inline">مركز التحكم</span></button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 truncate text-xl font-black">{cur && <cur.icon className="h-5 w-5 text-accent" />}{cur?.label ?? "لوحة المدير"}</h1>
            {cur && <p className="hidden truncate text-xs text-muted-foreground sm:block">{cur.hint}</p>}
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold sm:flex" title="التنبيهات الفورية مفعّلة"><span className="admin-live h-2 w-2 rounded-full bg-green-500" /> مباشر</span>
          <button type="button" onClick={() => setPalette(true)} className="flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-sm text-muted-foreground transition hover:bg-secondary">
            <Search className="h-4 w-4" /><span className="hidden sm:inline">بحث وانتقال سريع</span><kbd className="hidden rounded border border-border bg-card px-1.5 text-[10px] sm:inline" dir="ltr">Ctrl K</kbd>
          </button>
          <button type="button" onClick={() => items.includes("orders") && pick("orders")} aria-label={`${totalAlerts} تنبيه`} className={`${iconBtn} relative`}>
            <Bell className="h-4 w-4" />{totalAlerts > 0 && <span className="admin-pulse absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-black text-accent-foreground">{totalAlerts}</span>}
          </button>
          <button type="button" onClick={refresh} aria-label="تحديث البيانات" title="تحديث كل البيانات" className={iconBtn}><RefreshCw className={`h-4 w-4 ${spin ? "animate-spin" : ""}`} /></button>
          <button type="button" onClick={() => setPrefs((v) => ({ sidebar: !v.sidebar }))} aria-label="الشريط الجانبي" title="إظهار / إخفاء الشريط الجانبي" aria-pressed={prefs.sidebar} className={`${iconBtn} hidden lg:grid ${prefs.sidebar ? "!bg-primary text-primary-foreground" : ""}`}><PanelRight className="h-4 w-4" /></button>
          <button type="button" onClick={() => setPrefs((v) => ({ wide: !v.wide }))} aria-label="تبديل عرض الصفحة" title="عرض كامل / عرض عادي" aria-pressed={prefs.wide} className={`${iconBtn} hidden lg:grid ${prefs.wide ? "!bg-primary text-primary-foreground" : ""}`}><Maximize2 className="h-4 w-4" /></button>
          <button type="button" onClick={toggle} aria-label="تبديل الوضع" className={iconBtn}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          <button type="button" onClick={onSignOut} aria-label="خروج" title={email} className={iconBtn}><LogOut className="h-4 w-4" /></button>
        </div>

        <div key={tab} className="admin-view">{children}</div>
      </div>

      {/* درج الجوال */}
      <div className={`fixed inset-0 z-50 bg-black/45 backdrop-blur-sm transition-opacity lg:hidden ${drawer ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setDrawer(false)} aria-hidden={!drawer} />
      <aside dir="rtl" role="dialog" aria-modal="true" aria-label="أقسام لوحة المدير" aria-hidden={!drawer}
        className={`fixed bottom-0 right-0 top-0 z-[55] w-[min(86vw,320px)] overflow-y-auto bg-card p-4 shadow-2xl transition-transform duration-300 lg:hidden ${drawer ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black"><BarChart3 className="h-5 w-5 text-accent" /> لوحة المدير</div>
          <button type="button" onClick={() => setDrawer(false)} aria-label="إغلاق" className={iconBtn}><X className="h-4 w-4" /></button>
        </div>
        {navBody(false)}
      </aside>

      {/* البحث السريع */}
      <CommandDialog open={palette} onOpenChange={setPalette}>
        <CommandInput placeholder="اكتب اسم قسم أو إجراء…" dir="rtl" />
        <CommandList dir="rtl">
          <CommandEmpty>لا نتائج</CommandEmpty>
          <CommandGroup heading="الأقسام">
            {visible.map((n, k) => (
              <CommandItem key={n.id} value={`${n.label} ${n.hint} ${n.group}`} onSelect={() => pick(n.id)}>
                <n.icon className="ml-2 h-4 w-4" /> <span className="flex-1">{n.label}</span>
                {(badges[n.id] ?? 0) > 0 && <span className="ml-2 rounded-full bg-accent px-2 text-xs font-black text-accent-foreground">{badges[n.id]}</span>}
                {k < 9 && <CommandShortcut dir="ltr">Alt {k + 1}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="إجراءات">
            <CommandItem value="تحديث البيانات refresh" onSelect={() => { setPalette(false); void refresh(); }}><RefreshCw className="ml-2 h-4 w-4" /> تحديث كل البيانات</CommandItem>
            <CommandItem value="الوضع الداكن الفاتح theme dark" onSelect={() => { setPalette(false); toggle(); }}>{dark ? <Sun className="ml-2 h-4 w-4" /> : <Moon className="ml-2 h-4 w-4" />} تبديل الوضع الداكن / الفاتح</CommandItem>
            <CommandItem value="عرض كامل واسع wide" onSelect={() => { setPalette(false); setPrefs((v) => ({ wide: !v.wide })); }}><Maximize2 className="ml-2 h-4 w-4" /> تبديل عرض الصفحة</CommandItem>
            <CommandItem value="تسجيل الخروج logout" onSelect={() => { setPalette(false); onSignOut(); }}><LogOut className="ml-2 h-4 w-4" /> تسجيل الخروج</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
