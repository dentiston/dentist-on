import { Link } from "@tanstack/react-router";
import { Bell, BellRing } from "lucide-react";
import { useCustomer } from "@/lib/customer";
import { useWatch } from "@/lib/extras";

// يظهر بدل «نفد» على المنتج النافد
export function WatchButton({ productId }: { productId: string }) {
  const { session, customer } = useCustomer();
  const { watching, toggle } = useWatch(customer?.status === "approved" ? session?.user.id : undefined);
  if (!session || customer?.status !== "approved")
    return <Link to="/account" className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold"><Bell className="h-4 w-4" /> فعّل حسابك لتُعلَم عند التوفر</Link>;
  const on = watching.has(productId);
  return (
    <button onClick={() => toggle(productId)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${on ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>
      {on ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {on ? "سنُعلمك عند التوفر — اضغط للإلغاء" : "أعلمني عند التوفر"}
    </button>
  );
}
