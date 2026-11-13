import { useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useProducts, unitPrice } from "@/lib/products";
import { useDiscounts } from "@/lib/promos";
import { useShopConfig } from "@/lib/config";
import { Price } from "@/components/Price";
import { haptic } from "@/lib/fx";

// شريط تقدّم نحو الحد الأدنى للطلب (يظهر تحت الترويسة عند وجود منتجات في السلة)
export function CartProgress() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { cart } = useCart();
  const { data: products = [] } = useProducts();
  const { data: cfg } = useShopConfig();
  const pctFor = useDiscounts();
  const min = cfg?.minOrder ?? 0;
  const total = products.reduce((s, p) => (cart[p.id] ? s + unitPrice(p, cart[p.id]!, pctFor(p)) * cart[p.id]! : s), 0);
  const reached = min > 0 && total >= min;
  const was = useRef(reached);
  useEffect(() => { if (reached && !was.current) haptic(30); was.current = reached; }, [reached]);
  if (min <= 0 || total <= 0 || path.startsWith("/cart") || path.startsWith("/admin")) return null;
  const pct = Math.min(100, (total / min) * 100);
  return (
    <Link to="/cart" className="block border-t border-border/60 px-4 py-1.5">
      <div className="mx-auto flex max-w-6xl items-center gap-3 text-xs font-bold">
        {reached
          ? <span className="progress-pop flex shrink-0 items-center gap-1 text-primary"><Check className="h-4 w-4" /> وصلت للحد الأدنى، أكمل طلبك</span>
          : <span className="shrink-0">باقي <Price usd={min - total} usdToo={false} /> للحد الأدنى</span>}
        <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <span className="absolute inset-y-0 right-0 rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </span>
      </div>
    </Link>
  );
}
