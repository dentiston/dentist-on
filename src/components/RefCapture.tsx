import { useEffect } from "react";
import { saveRef } from "@/lib/referral";

// يحفظ كود الموزع من الرابط (?ref=CODE) في أي صفحة، ليُربط به الطبيب عند التسجيل
export function RefCapture() {
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("ref");
    if (c) saveRef(c);
  }, []);
  return null;
}
