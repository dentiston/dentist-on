import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { type Product, fmt } from "@/lib/products";
import { useCart } from "@/lib/cart";

export function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg">
      <Link to="/product/$id" params={{ id: p.id }} className="aspect-square overflow-hidden bg-muted">
        <img src={p.image} alt={p.name} loading="lazy" width={816} height={816} className="h-full w-full object-cover transition group-hover:scale-105" />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-semibold text-muted-foreground">{p.brand}</span>
        <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-2 font-bold leading-snug">{p.name}</Link>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <div className="text-lg font-black">{fmt(p.price)}</div>
            <div className="text-xs text-muted-foreground">{fmt(p.bulkPrice)} للجملة (10+)</div>
          </div>
          <button
            onClick={() => { add(p.id); toast.success("أُضيف إلى السلة"); }}
            aria-label="أضف للسلة"
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground transition hover:scale-110"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
