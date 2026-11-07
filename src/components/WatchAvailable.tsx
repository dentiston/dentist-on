import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCustomer } from "@/lib/customer";
import { useProducts, soldOut } from "@/lib/products";
import { useWatch } from "@/lib/extras";
import { useCart } from "@/lib/cart";

// «توفّر الآن»: منتجات طلب الزبون إعلامه عنها وعادت للمخزون
export function WatchAvailable() {
  const { session, customer } = useCustomer();
  const { watching, toggle } = useWatch(customer?.status === "approved" ? session?.user.id : undefined);
  const { data: products = [] } = useProducts();
  const { add } = useCart();
  const ready = products.filter((p) => watching.has(p.id) && p.active && !soldOut(p));
  if (ready.length === 0) return null;
  return (
    <section className="mx-auto mt-6 max-w-6xl px-4">
      <div className="rounded-2xl border border-accent bg-card p-4">
        <div className="font-black text-accent">توفّر الآن</div>
        <ul className="mt-2 space-y-2">
          {ready.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
              <Link to="/product/$id" params={{ id: p.id }} className="font-bold underline">{p.name}</Link>
              <span className="flex gap-2">
                <button onClick={() => { add(p.id); toast.success("أُضيف إلى السلة"); toggle(p.id); }} className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">أضف للسلة</button>
                <button onClick={() => toggle(p.id)} className="rounded-full bg-muted px-4 py-1.5 text-sm">إزالة</button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
