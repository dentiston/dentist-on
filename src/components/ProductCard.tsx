import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { type Product, imgSrc, soldOut } from "@/lib/products";
import { Price } from "@/components/Price";
import { useCart } from "@/lib/cart";

export function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg">
      <Link to="/product/$id" params={{ id: p.id }} className="aspect-square overflow-hidden bg-muted">
        <img src={imgSrc(p.image)} alt={p.name} loading="lazy" width={816} height={816} className="h-full w-full object-cover transition group-hover:scale-105" />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-semibold text-muted-foreground">{p.brand}{soldOut(p) && <b className="mr-2 text-destructive">نفد</b>}</span>
        <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-2 font-bold leading-snug">{p.name}</Link>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <Price usd={p.price} className="block text-lg font-black" />
            <div className="text-xs text-muted-foreground"><Price usd={p.bulk_price} usdToo={false} /> للجملة (10+)</div>
          </div>
          <button
            disabled={soldOut(p)}
            onClick={() => { add(p.id); toast.success("أُضيف إلى السلة"); }}
            aria-label={soldOut(p) ? "نفد المخزون" : "أضف للسلة"}
            className="disabled:opacity-40 disabled:hover:scale-100 grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground transition hover:scale-110"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
