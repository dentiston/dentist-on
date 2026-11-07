import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void> };

// يظهر فقط حين يسمح المتصفح بتثبيت التطبيق (أندرويد/كروم). على iOS: مشاركة ← إضافة للشاشة الرئيسية.
export function InstallButton() {
  const [ev, setEv] = useState<BIPEvent | null>(null);
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setEv(e as BIPEvent); };
    const done = () => setEv(null);
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  if (!ev) return null;
  return (
    <button onClick={() => { ev.prompt(); setEv(null); }} aria-label="تثبيت التطبيق" className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
      <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">ثبّت التطبيق</span>
    </button>
  );
}
