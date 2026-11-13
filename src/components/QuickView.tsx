import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { type Product, imgSrc, soldOut, unitPrice } from "@/lib/products";
import { Price } from "@/components/Price";
import { useCart } from "@/lib/cart";
import { flyToCart } from "@/lib/fx";

// معاينة سريعة: ورقة تنزلق من الأسفل، تُغلق بالسحب لأسفل
export function QuickView({ p, pct = 0, open, onOpenChange }: { p: Product; pct?: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const img = useRef<HTMLImageElement>(null);
  const out = soldOut(p);
  const max = p.stock ?? Infinity;
  return (
    <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQty(1); }}>
      <DrawerContent dir="rtl" className="mx-auto max-w-lg">
        <div className="max-h-[80vh] overflow-y-auto p-5">
          <div className="flex gap-4">
            <img ref={img} src={imgSrc(p.image)} alt={p.name} className="h-28 w-28 shrink-0 rounded-2xl bg-muted object-cover" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-muted-foreground">{p.brand}</div>
              <DrawerTitle className="text-lg font-black leading-snug">{p.name}</DrawerTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Price usd={unitPrice(p, 1, pct)} className="text-lg font-black" />
                {pct > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-black text-accent-foreground">-{pct}%</span>}
              </div>
              <div className="text-xs text-muted-foreground"><Price usd={unitPrice(p, 10, pct)} usdToo={false} /> للجملة (10+)</div>
            </div>
          </div>
          <DrawerDescription className="mt-3 line-clamp-4 text-start">{p.description}</DrawerDescription>
          {out ? (
            <div className="mt-4 font-bold text-destructive">نفد المخزون حالياً</div>
          ) : (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-input">
                <button type="button" className="px-4 py-2 text-lg" aria-label="أنقص" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span className="w-8 text-center font-bold">{qty}</span>
                <button type="button" className="px-4 py-2 text-lg" aria-label="زِد" onClick={() => setQty(Math.min(qty + 1, max))}>+</button>
              </div>
              <button
                type="button"
                onClick={() => {
                  add(p.id, qty);
                  flyToCart(img.current);
                  toast.success("أُضيف إلى السلة");
                  setTimeout(() => onOpenChange(false), 250);
                }}
                className="flex-1 rounded-full bg-primary py-3 font-bold text-primary-foreground transition active:scale-[.98]"
              >
                أضف للسلة — <Price usd={unitPrice(p, qty, pct) * qty} usdToo={false} />
              </button>
            </div>
          )}
          <Link to="/product/$id" params={{ id: p.id }} onClick={() => onOpenChange(false)} className="mt-4 block text-center text-sm font-bold text-primary underline">التفاصيل الكاملة والتقييمات</Link>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
