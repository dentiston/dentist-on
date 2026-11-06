import { fmt } from "@/lib/products";
import { fmtSyp, useRate } from "@/lib/rate";

// الليرة السورية أولاً والدولار تحتها. إن لم يُحدَّد سعر الصرف يُعرض الدولار فقط.
export function Price({ usd, usdToo = true, className }: { usd: number; usdToo?: boolean; className?: string }) {
  const { data } = useRate();
  const rate = data?.rate ?? 0;
  if (!rate) return <span className={className}>{fmt(usd)}</span>;
  return (
    <span className={className}>
      {fmtSyp(usd, rate)}
      {usdToo && <span className="block text-xs font-normal text-muted-foreground" dir="ltr">{fmt(usd)}</span>}
    </span>
  );
}
