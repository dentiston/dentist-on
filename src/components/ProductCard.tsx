import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { type Product, imgSrc, soldOut, unitPrice } from "@/lib/products";
import { Price } from "@/components/Price";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickView } from "@/components/QuickView";
import { useCart } from "@/lib/cart";
import { flyToCart, reducedMotion } from "@/lib/fx";
import { RatingBadge } from "@/components/ProductReviews";

// يظهر العنصر بحركة عند دخوله الشاشة (مرة واحدة)
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion() || !("IntersectionObserver" in window)) { el.classList.add("is-in"); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { el.classList.add("is-in"); io.disconnect(); } }, { rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

const spotlight = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

export function ProductCard({ p, pct = 0, i = 0 }: { p: Product; pct?: number; i?: number }) {
  const { add } = useCart();
  const wrap = useReveal<HTMLDivElement>();
  const img = useRef<HTMLImageElement>(null);
  const [quick, setQuick] = useState(false);
  return (
    <div ref={wrap} className="reveal" style={{ ["--i" as string]: i % 4 } as CSSProperties}>
      <div onPointerMove={spotlight} className="card-spot group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Link to="/product/$id" params={{ id: p.id }} className="block h-full w-full">
            <img ref={img} src={imgSrc(p.image)} alt={p.name} loading="lazy" width={816} height={816} className="h-full w-full object-cover transition group-hover:scale-105" />
          </Link>
          {pct > 0 && <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-black text-accent-foreground">-{pct}%</span>}
          <button type="button" onClick={() => setQuick(true)} aria-label={`نظرة سريعة: ${p.name}`}
            className="absolute bottom-2 left-2 grid h-9 w-9 place-items-center rounded-full bg-card/90 shadow backdrop-blur transition hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
            <Eye className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <span className="text-xs font-semibold text-muted-foreground">{p.brand}{soldOut(p) && <b className="mr-2 text-destructive">نفد</b>}</span>
          <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-2 font-bold leading-snug">{p.name}</Link>
          <RatingBadge id={p.id} />
          <div className="mt-auto flex items-end justify-between pt-3">
            <div>
              <Price usd={unitPrice(p, 1, pct)} className="block text-lg font-black" />
              {pct > 0 && <s className="text-xs text-muted-foreground"><Price usd={p.price} usdToo={false} /></s>}
              <div className="text-xs text-muted-foreground"><Price usd={unitPrice(p, 10, pct)} usdToo={false} /> للجملة (10+)</div>
            </div>
            <button
              disabled={soldOut(p)}
              onClick={() => { add(p.id); flyToCart(img.current); toast.success("أُضيف إلى السلة"); }}
              aria-label={soldOut(p) ? "نفد المخزون" : "أضف للسلة"}
              className="disabled:opacity-40 disabled:hover:scale-100 grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground transition hover:scale-110 active:scale-90"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      {quick && <QuickView p={p} pct={pct} open={quick} onOpenChange={setQuick} />}
    </div>
  );
}

// هياكل تحميل بدل الدوّار
export function ProductGridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4" aria-busy="true" aria-label="جارِ تحميل المنتجات">
      {Array.from({ length: n }, (_, k) => (
        <div key={k} className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-1/3" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-1/2" />
            <div className="flex items-end justify-between pt-3"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-10 w-10 rounded-full" /></div>
          </div>
        </div>
      ))}
    </div>
  );
}
