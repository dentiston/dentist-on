import { useState } from "react";
import { type Product, imgSrc } from "@/lib/products";

// صورة رئيسية + صور إضافية بمصغّرات
export function Gallery({ p }: { p: Product }) {
  const all = [p.image, ...(p.images ?? [])].filter((x, i, a) => !!x && a.indexOf(x) === i);
  const [i, setI] = useState(0);
  const cur = all[Math.min(i, all.length - 1)] ?? p.image;
  return (
    <div>
      <img src={imgSrc(cur)} alt={p.name} width={816} height={816} className="w-full rounded-3xl bg-muted object-cover" />
      {all.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {all.map((src, k) => (
            <button key={src} onClick={() => setI(k)} aria-label={`صورة ${k + 1}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${k === i ? "border-accent" : "border-transparent"}`}>
              <img src={imgSrc(src)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
