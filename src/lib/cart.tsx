import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Cart = Record<string, number>;
type Ctx = {
  cart: Cart; set: (id: string, qty: number) => void; add: (id: string, qty?: number) => void;
  addMany: (list: { id: string; qty: number }[]) => void; clear: () => void; count: number;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = "dentist-on-cart";
const readLocal = (): Cart => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const [uid, setUid] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setCart(readLocal()); }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user.id ?? null));
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // عند الدخول: ندمج سلة الحساب مع سلة هذا الجهاز (الأكبر كمية يفوز) ثم نحفظ الناتج في الحساب
  useEffect(() => {
    if (!uid) { setSynced(false); return; }
    let off = false;
    (async () => {
      const { data } = await supabase.from("customer_carts").select("items").eq("user_id", uid).maybeSingle();
      if (off) return;
      const server = (data?.items ?? {}) as Cart;
      const merged: Cart = { ...server };
      for (const [id, q] of Object.entries(readLocal())) merged[id] = Math.max(merged[id] || 0, Number(q) || 0);
      setCart(merged);
      localStorage.setItem(KEY, JSON.stringify(merged));
      setSynced(true);
      if (JSON.stringify(merged) !== JSON.stringify(server))
        await supabase.from("customer_carts").upsert({ user_id: uid, items: merged, updated_at: new Date().toISOString() });
    })();
    return () => { off = true; };
  }, [uid]);

  const save = (c: Cart) => {
    setCart(c);
    localStorage.setItem(KEY, JSON.stringify(c));
    if (uid && synced) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        supabase.from("customer_carts").upsert({ user_id: uid, items: c, updated_at: new Date().toISOString() }).then(() => {});
      }, 600);
    }
  };
  const set = (id: string, qty: number) => {
    const c = { ...cart };
    if (qty <= 0) delete c[id]; else c[id] = qty;
    save(c);
  };
  const add = (id: string, qty = 1) => set(id, (cart[id] || 0) + qty);
  const addMany = (list: { id: string; qty: number }[]) => {
    const c = { ...cart };
    for (const { id, qty } of list) c[id] = (c[id] || 0) + qty;
    save(c);
  };
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  return <CartCtx.Provider value={{ cart, set, add, addMany, clear: () => save({}), count }}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside provider");
  return c;
};
