import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCart } from "@/lib/cart";
import { useAdmin } from "@/lib/auth";
import { useRate } from "@/lib/rate";

export function SiteHeader() {
  const { count } = useCart();
  const { isAdmin } = useAdmin();
  const { data: r } = useRate();
  const rate = r?.rate ?? 0;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      {rate > 0 && (
        <div className="bg-primary px-4 py-1 text-center text-xs font-semibold text-primary-foreground dark:bg-accent dark:text-accent-foreground">
          سعر الصرف اليوم: <span dir="ltr">1 $ = {rate.toLocaleString("en-US")} ل.س</span>
          {r?.updatedAt && <> · آخر تحديث {new Date(r.updatedAt).toLocaleDateString("ar")}</>}
        </div>
      )}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center">
          <Logo className="h-12 sm:h-20 w-auto max-w-[50vw] object-contain" />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5 text-sm font-semibold">
          <Link to="/" className="hidden sm:inline hover:text-accent">المتجر</Link>
          <Link to="/account" className="hover:text-accent">حسابي</Link>
          {isAdmin && <Link to="/admin" className="hover:text-accent">المدير</Link>}
          <ThemeToggle />
          <Link to="/cart" aria-label="السلة" className="relative flex items-center gap-2 rounded-full bg-primary px-3 sm:px-4 py-2 text-primary-foreground">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">السلة</span>
            {count > 0 && (
              <span className="absolute -top-2 -left-2 grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1 text-xs text-accent-foreground">{count}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
