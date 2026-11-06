import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Cart = Record<string, number>;
type Ctx = { cart: Cart; set: (id: string, qty: number) => void; add: (id: string, qty?: number) => void; clear: () => void; count: number };
const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("dentist-on-cart") || "{}")); } catch { /* ignore */ }
  }, []);
  const save = (c: Cart) => { setCart(c); localStorage.setItem("dentist-on-cart", JSON.stringify(c)); };
  const set = (id: string, qty: number) => {
    const c = { ...cart };
    if (qty <= 0) delete c[id]; else c[id] = qty;
    save(c);
  };
  const add = (id: string, qty = 1) => set(id, (cart[id] || 0) + qty);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  return <CartCtx.Provider value={{ cart, set, add, clear: () => save({}), count }}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside provider");
  return c;
};
