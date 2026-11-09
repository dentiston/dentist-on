import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { CloudDownload, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useCart, type SyncMode } from "@/lib/cart";
import { diffCart } from "@/lib/cart-sync";
import { clearOffline, readMeta, type OfflineMeta } from "@/lib/offline";
import { downloadStore } from "@/lib/offline-download";
import { offlineSupported } from "@/lib/use-online";
import { useProducts } from "@/lib/products";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const mb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1048576))} ميغابايت`;

// أزرار عائمة على طرف الصفحة: «تنزيل المتجر للتسوق دون اتصال» و«تأكيد مزامنة السلة» (تظهر عند عودة الاتصال).
export function OfflineManager() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const { cart, sync } = useCart();
  const { data: products = [] } = useProducts();
  const [supported, setSupported] = useState(false);
  const [meta, setMeta] = useState<OfflineMeta | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [dlOpen, setDlOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState("");

  const refreshStats = async () => {
    setMeta(readMeta());
    try { setUsage((await navigator.storage?.estimate?.())?.usage ?? null); } catch { setUsage(null); }
  };
  useEffect(() => { setSupported(offlineSupported()); void refreshStats(); }, []);

  // عند عودة الاتصال مع تغييرات معلّقة: تنبيه يفتح نافذة المراجعة
  const needsConfirm = sync.loggedIn && sync.online && sync.pending && !!sync.serverCart;
  useEffect(() => {
    if (!needsConfirm) return;
    toast("عاد الاتصال. أكّد مزامنة سلتك مع حسابك", { id: "cart-sync", duration: 10000, action: { label: "مراجعة", onClick: () => setSyncOpen(true) } });
  }, [needsConfirm]);

  if (path.startsWith("/admin")) return null;

  const start = async () => {
    if (running) return;
    if (!sync.online) { toast.error("التنزيل يحتاج اتصالاً بالإنترنت"); return; }
    setRunning(true); setPct(0); setLabel("جارِ التحضير…");
    try {
      await downloadStore(qc, (p, l) => { setPct(p); setLabel(l); });
      toast.success("تم تنزيل المتجر، يمكنك التسوق دون اتصال");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "تعذّر التنزيل، حاول مجددًا");
    } finally {
      setRunning(false);
      void refreshStats();
    }
  };
  const remove = async () => {
    await clearOffline();
    toast.success("حُذفت النسخة المحمّلة");
    void refreshStats();
  };

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? "منتج غير معروف";
  const changes = sync.serverCart ? diffCart(cart, sync.serverCart) : [];
  const choose = async (mode: SyncMode) => { if (await sync.confirm(mode)) setSyncOpen(false); };
  const fab = "fixed right-5 z-40 flex items-center gap-2 rounded-full font-bold shadow-lg";
  const bottom = (rem: number) => ({ bottom: `calc(${rem}rem + env(safe-area-inset-bottom))` });

  return (
    <>
      {needsConfirm && (
        <button onClick={() => setSyncOpen(true)} style={bottom(5.5)} className={`${fab} bg-primary px-4 py-3 text-primary-foreground`}>
          <span className="absolute -top-1 -left-1 h-3 w-3 animate-ping rounded-full bg-accent" />
          <RefreshCw className="h-4 w-4" /> <span className="text-sm">تأكيد مزامنة السلة</span>
        </button>
      )}
      <button
        onClick={() => { setDlOpen(true); void refreshStats(); }}
        style={bottom(1.25)}
        aria-label="التسوق دون اتصال"
        className={`${fab} ${sync.online ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"} px-4 py-3`}
      >
        {sync.online ? <CloudDownload className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        {running ? <span className="text-sm" dir="ltr">{Math.round(pct)}%</span> : <span className="hidden text-sm sm:inline">{sync.online ? "تسوّق دون اتصال" : "دون اتصال"}</span>}
      </button>

      <Dialog open={dlOpen} onOpenChange={setDlOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>التسوق دون اتصال</DialogTitle>
            <DialogDescription>نزّل المتجر (المنتجات والأسعار والصور) على جهازك لتتصفح وتجهّز سلتك بلا إنترنت.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {!sync.online && <div className="rounded-xl bg-muted p-3">أنت الآن دون اتصال. يمكنك التصفح وإضافة المنتجات للسلة، وسنطلب تأكيد المزامنة عند عودة الاتصال.</div>}
            {!supported && <div className="rounded-xl bg-muted p-3">التنزيل متاح في النسخة المنشورة من المتجر فقط (غير متاح في المعاينة أو المتصفحات غير المدعومة).</div>}
            {meta ? (
              <div className="rounded-xl bg-secondary p-3">
                <div className="font-bold">آخر تنزيل: {new Date(meta.at).toLocaleString("ar")}</div>
                <div className="mt-1 text-muted-foreground">{meta.products} منتج · {meta.pages} صفحة · {meta.images} صورة{meta.failed > 0 && ` · تعذّر ${meta.failed} صورة`}{usage != null && ` · المساحة المستخدمة ≈ ${mb(usage)}`}</div>
              </div>
            ) : (
              <div className="rounded-xl bg-secondary p-3 text-muted-foreground">لم تُنزّل المتجر بعد.</div>
            )}
            {running && (
              <div className="space-y-2">
                <Progress value={pct} />
                <div className="text-muted-foreground">{label}</div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">إرسال الطلب وكود الخصم يحتاجان اتصالاً. السلة تُحفظ على جهازك، وتُزامَن مع حسابك بعد تأكيدك.</p>
            <button onClick={start} disabled={!supported || running || !sync.online} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">
              {running ? "جارِ التنزيل… أبقِ الصفحة مفتوحة" : meta ? "تحديث التنزيل" : "تنزيل المتجر"}
            </button>
            {meta && !running && (
              <button onClick={remove} className="flex w-full items-center justify-center gap-2 rounded-full bg-muted py-2 font-bold"><Trash2 className="h-4 w-4" /> حذف النسخة المحمّلة</button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={syncOpen && needsConfirm} onOpenChange={setSyncOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد مزامنة السلة</DialogTitle>
            <DialogDescription>عدّلتَ السلة دون اتصال وتختلف عن سلة حسابك. اختر ما يُعتمد، ولن يُرسل أي طلب تلقائياً.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-secondary p-3">
              {changes.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3">
                  <span className="line-clamp-1">{nameOf(c.id)}</span>
                  <span className="shrink-0 text-muted-foreground">الجهاز <b>{c.device}</b> · الحساب <b>{c.account}</b></span>
                </div>
              ))}
              {changes.length === 0 && <div className="text-muted-foreground">لا فروق ظاهرة.</div>}
            </div>
            <button disabled={sync.busy} onClick={() => choose("device")} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">اعتماد سلة هذا الجهاز</button>
            <button disabled={sync.busy} onClick={() => choose("merge")} className="w-full rounded-full bg-accent py-3 font-bold text-accent-foreground disabled:opacity-60">دمج السلتين (الأكبر كمية)</button>
            <button disabled={sync.busy} onClick={() => choose("account")} className="w-full rounded-full bg-muted py-3 font-bold disabled:opacity-60">الإبقاء على سلة الحساب</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
