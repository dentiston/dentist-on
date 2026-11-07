import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// isAdmin: مدير كامل. isStaff: موظف بصلاحيات محددة (perms).
export function useAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [perms, setPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async (s: Session | null) => {
      setSession(s);
      if (!s) { setIsAdmin(false); setIsStaff(false); setPerms([]); setLoading(false); return; }
      const { data: admin } = await supabase.rpc("has_role", { _user_id: s.user.id, _role: "admin" });
      let staff = false;
      if (!admin) {
        const { data } = await supabase.rpc("has_role", { _user_id: s.user.id, _role: "staff" });
        staff = !!data;
        if (staff) {
          const { data: prof } = await supabase.from("staff_profiles").select("permissions").eq("user_id", s.user.id).maybeSingle();
          setPerms(prof?.permissions ?? []);
        }
      }
      setIsAdmin(!!admin);
      setIsStaff(staff);
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => check(s), 0); });
    supabase.auth.getSession().then(({ data }) => check(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, isAdmin, isStaff, perms, loading };
}
