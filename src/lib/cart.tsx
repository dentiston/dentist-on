import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isPending, mergeMax, normalizeCart, sameCart, setPendingFlag, type Cart } from "@/lib/cart-sync";
import { useOnline } from "@/lib/use-online";

export type SyncMode = "device" | "merge" | "account";
type Sync = {
  online: boolean;
  loggedIn: boolean;
  pending: boolean; // تغييرات على هذا الجهاز لم تُؤكَّد مزامنتها مع الحساب
  serverCart: Cart | null; // سلة الحساب بعد عودة الاتصال، جاهزة للمقارنة والتأكيد
  busy: boolean;
  confirm: (mode: SyncMode) => Promise<boolean>;
};
type Ctx = {
  cart: Cart; set: (id: string, qty: number) => void; add: (id: string, qty?: number) => void;
  addMany: (list: { id: string; qty: number }[]) => void; clear: () => void; count: number; sync: Sync;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = "dentist-on-cart";
const readLocal = (): Cart => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const [uid, setUid] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverCart, setServerCart] = useState<Cart | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const online = useOnline();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const markPending = () => { setPendingFlag(true); setPending(true); };
  const clearPending = () => { setPendingFlag(false); setPending(false); };

  useEffect(() => { setCart(readLocal()); setPending(isPending()); }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user.id ?? null));
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // عند الدخول (أو عودة الاتصال): نقرأ سلة الحساب.
  // - لا تغييرات معلّقة: ندمج السلتين (الأكبر كمية يفوز) ونحفظ الناتج في الحساب كما كان.
  // - تغييرات معلّقة (عُدّلت السلة دون اتصال): لا نكتب شيئاً في الحساب قبل تأكيد المستخدم.
  useEffect(() => {
    if (!uid) { setSynced(false); setServerCart(null); return; }
    if (!online || (synced && !pending)) return;
    let off = false;
    (async () => {
      const { data, error } = await supabase.from("customer_carts").select("items").eq("user_id", uid).maybeSingle();
      if (off) return;
      if (error) { setLoadFailed(true); return; } // لا نعتمد على بيانات غير مؤكدة؛ نعيد المحاولة عند عودة الاتصال
      setLoadFailed(false);
      const server = (data?.items ?? {}) as Cart;
      const local = readLocal();
      if (isPending()) {
        if (sameCart(server, local)) { clearPending(); setServerCart(null); setSynced(true); }
        else setServerCart(server);
        return;
      }
      const merged = mergeMax(server, local);
      setCart(merged);
      localStorage.setItem(KEY, JSON.stringify(merged));
      setSynced(true);
      if (!sameCart(merged, server)) {
        const { error: e2 } = await supabase.from("customer_carts").upsert({ user_id: uid, items: merged, updated_at: new Date().toISOString() });
        if (e2) markPending();
      }
    })();
    return () => { off = true; };
  }, [uid, online, pending, synced]);

  const save = (c: Cart) => {
    setCart(c);
    localStorage.setItem(KEY, JSON.stringify(c));
    // دون اتصال (أو تعذّر قراءة الحساب): نحفظ على الجهاز ونطلب تأكيد المزامنة لاحقاً
    if (!navigator.onLine || (uid && loadFailed)) { clearTimeout(timer.current); markPending(); return; }
    if (uid && synced && !pending) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        supabase.from("customer_carts").upsert({ user_id: uid, items: c, updated_at: new Date().toISOString() })
          .then(({ error }) => { if (error) markPending(); }, () => markPending());
      }, 600);
    }
  };

  const confirm = async (mode: SyncMode) => {
    if (!uid || !serverCart) return false;
    const local = readLocal();
    const next = mode === "account" ? normalizeCart(serverCart) : mode === "merge" ? mergeMax(serverCart, local) : normalizeCart(local);
    setBusy(true);
    const { error } = mode === "account"
      ? { error: null }
      : await supabase.from("customer_carts").upsert({ user_id: uid, items: next, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) { toast.error("تعذّرت المزامنة، تحقق من الاتصال وحاول مجددًا"); return false; }
    setCart(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    clearPending();
    setServerCart(null);
    setSynced(true);
    toast.success("تمت مزامنة السلة ✓");
    return true;
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
  const sync: Sync = { online, loggedIn: !!uid, pending, serverCart, busy, confirm };
  return <CartCtx.Provider value={{ cart, set, add, addMany, clear: () => save({}), count, sync }}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside provider");
  return c;
};
