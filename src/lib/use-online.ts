import { useEffect, useState } from "react";
import { isPreviewEnv } from "@/lib/offline";

// حالة الاتصال (تبدأ true لتطابق الخادم، ثم تُصحَّح بعد التحميل)
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  return online;
}

// التنزيل يعمل فقط في النسخة المنشورة (يلزم service worker وCache API) لا في المعاينة
export const offlineSupported = () =>
  typeof window !== "undefined" && import.meta.env.PROD && "serviceWorker" in navigator && "caches" in window && !isPreviewEnv();
