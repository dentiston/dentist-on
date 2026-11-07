import { useCallback, useEffect, useState } from "react";

// الموقع يبدأ دائماً بالوضع الفاتح؛ التبديل يتم بالضغط على الشعار ولا يُحفظ
export const THEME_SCRIPT = `try{document.documentElement.classList.remove("dark");localStorage.removeItem("theme")}catch(e){}`;

export function useDark() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const toggle = useCallback(() => {
    document.documentElement.classList.toggle("dark");
  }, []);

  return { dark, toggle };
}
