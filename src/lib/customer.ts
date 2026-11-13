import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/db";
import { clearRef, readRef } from "@/lib/referral";

export type Customer = {
  user_id: string; clinic_name: string; phone: string; address: string;
  status: "pending" | "approved" | "rejected"; created_at: string; discount_percent?: number | null;
  distributor_id?: string | null;
};

// ربط الطبيب بموزعه مرة واحدة (الكود محفوظ من الرابط، أو من بيانات التسجيل إن فُتح التأكيد من جهاز آخر)
const attaching = new Map<string, Promise<void>>();
async function attachRef(s: Session) {
  const code = readRef() || String(s.user.user_metadata?.["ref"] ?? "").toUpperCase();
  if (!code) return;
  if (!attaching.has(s.user.id)) {
    attaching.set(s.user.id, (async () => {
      const { error } = await sb.rpc("attach_distributor", { p_code: code });
      if (!error) clearRef();
    })().finally(() => setTimeout(() => attaching.delete(s.user.id), 5000)));
  }
  await attaching.get(s.user.id);
}

// آخر بيانات للزبون (الخصم وحالة الحساب) لعرض السلة بشكل صحيح دون اتصال
const CK = "dentist-on-customer";
const readCachedCustomer = (userId?: string): Customer | null => {
  try {
    const c = JSON.parse(localStorage.getItem(CK) || "null") as Customer | null;
    return c && (!userId || c.user_id === userId) ? c : null;
  } catch { return null; }
};

export function useCustomer() {
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      // دون اتصال قد يتعذّر تجديد الجلسة؛ نعرض آخر بيانات محفوظة بدل اعتباره زائراً
      setCustomer(typeof navigator !== "undefined" && !navigator.onLine ? readCachedCustomer() : null);
      setLoading(false);
      return;
    }
    await attachRef(s).catch(() => {});
    const { data, error } = await supabase.from("customers").select("*").eq("user_id", s.user.id).maybeSingle();
    if (error) {
      setCustomer(readCachedCustomer(s.user.id));
    } else {
      setCustomer((data as Customer | null) ?? null);
      try {
        if (data) localStorage.setItem(CK, JSON.stringify(data));
        else localStorage.removeItem(CK);
      } catch { /* التخزين غير متاح */ }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_OUT") { try { localStorage.removeItem(CK); } catch { /* */ } }
      setTimeout(() => load(s), 0);
    });
    supabase.auth.getSession().then(({ data }) => load(data.session));
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return { session, customer, loading, reload: () => load(session) };
}
