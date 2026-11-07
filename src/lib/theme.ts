import { useCallback, useEffect, useState } from "react";

export const THEME_KEY = "theme";

// يعمل قبل أول رسم للصفحة لمنع وميض الأبيض: يقرأ اختيار الزائر وإلا يتبع إعداد جهازه
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}`;

export function useDark() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    // إن لم يختر الزائر يدوياً، نتبع تغيّر إعداد الجهاز
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = (e: MediaQueryListEvent) => {
      try { if (localStorage.getItem(THEME_KEY)) return; } catch { /* ignore */ }
      el.classList.toggle("dark", e.matches);
    };
    mq.addEventListener("change", onSystem);
    return () => { mo.disconnect(); mq.removeEventListener("change", onSystem); };
  }, []);

  const toggle = useCallback(() => {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* ignore */ }
  }, []);

  return { dark, toggle };
}
