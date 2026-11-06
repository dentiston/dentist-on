import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Customer = {
  user_id: string; clinic_name: string; phone: string; address: string;
  status: "pending" | "approved" | "rejected"; created_at: string;
};

export function useCustomer() {
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) { setCustomer(null); setLoading(false); return; }
    const { data } = await supabase.from("customers").select("*").eq("user_id", s.user.id).maybeSingle();
    setCustomer((data as Customer | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => load(s), 0); });
    supabase.auth.getSession().then(({ data }) => load(data.session));
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return { session, customer, loading, reload: () => load(session) };
}
