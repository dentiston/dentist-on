import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import logo from "@/assets/logo.jpg.asset.json";
import { useCart } from "@/lib/cart";
import { useAdmin } from "@/lib/auth";

export function SiteHeader() {
  const { count } = useCart();
  const { isAdmin } = useAdmin();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center">
          <img src={logo.url} alt="Dentist On" className="h-14 w-auto object-contain mix-blend-multiply" />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link to="/" className="hidden sm:inline hover:text-accent">المتجر</Link>
          {isAdmin && <Link to="/admin" className="hover:text-accent">المدير</Link>}
          <Link to="/cart" className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground">
            <ShoppingCart className="h-4 w-4" />
            السلة
            {count > 0 && (
              <span className="absolute -top-2 -left-2 grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1 text-xs text-accent-foreground">{count}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
