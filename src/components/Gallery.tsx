import { useRef, useState, type PointerEvent } from "react";
import { type Product, imgSrc } from "@/lib/products";

type Z = { s: number; x: number; y: number };
const ONE: Z = { s: 1, x: 0, y: 0 };
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

// صورة رئيسية + مصغّرات. سحب جانبي للتنقل، نقر مزدوج أو قرص بإصبعين للتكبير.
export function Gallery({ p }: { p: Product }) {
  const all = [p.image, ...(p.images ?? [])].filter((x, i, a) => !!x && a.indexOf(x) === i);
  const [i, setI] = useState(0);
  const [z, setZ] = useState<Z>(ONE);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef({ x0: 0, y0: 0, moved: 0, d0: 0, s0: 1, lastTap: 0 });
  const idx = Math.min(i, all.length - 1);
  const cur = all[idx] ?? p.image;
  const go = (n: number) => { setI(((n % all.length) + all.length) % all.length); setZ(ONE); setDx(0); };
  const clamp = (v: Z): Z => {
    const r = box.current?.getBoundingClientRect();
    if (!r || v.s <= 1) return ONE;
    const mx = (r.width * (v.s - 1)) / 2, my = (r.height * (v.s - 1)) / 2;
    return { s: v.s, x: Math.max(-mx, Math.min(mx, v.x)), y: Math.max(-my, Math.min(my, v.y)) };
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g.current.x0 = e.clientX; g.current.y0 = e.clientY; g.current.moved = 0;
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      g.current.d0 = dist(a!, b!); g.current.s0 = z.s;
    }
    setDrag(true);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const prev = pts.current.get(e.pointerId);
    if (!prev) return;
    const cur2 = { x: e.clientX, y: e.clientY };
    pts.current.set(e.pointerId, cur2);
    g.current.moved = Math.max(g.current.moved, Math.hypot(e.clientX - g.current.x0, e.clientY - g.current.y0));
    if (pts.current.size >= 2) {
      const [a, b] = [...pts.current.values()];
      const s = Math.max(1, Math.min(4, g.current.s0 * (dist(a!, b!) / (g.current.d0 || 1))));
      setZ((v) => clamp({ ...v, s }));
    } else if (z.s > 1) {
      setZ((v) => clamp({ s: v.s, x: v.x + (cur2.x - prev.x), y: v.y + (cur2.y - prev.y) }));
    } else if (all.length > 1) {
      setDx(e.clientX - g.current.x0);
    }
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size > 0) return;
    setDrag(false);
    const { moved, lastTap } = g.current;
    if (moved < 8) {
      const now = Date.now();
      if (now - lastTap < 320) {
        const r = box.current?.getBoundingClientRect();
        if (z.s > 1 || !r) setZ(ONE);
        else { const s = 2.5; setZ(clamp({ s, x: -(e.clientX - (r.left + r.width / 2)) * (s - 1), y: -(e.clientY - (r.top + r.height / 2)) * (s - 1) })); }
        g.current.lastTap = 0;
      } else g.current.lastTap = now;
    } else if (z.s <= 1 && Math.abs(dx) > 50 && all.length > 1) {
      go(dx > 0 ? idx + 1 : idx - 1); // الواجهة من اليمين لليسار: السحب لليمين يعرض التالي
    }
    setDx(0);
  };

  return (
    <div>
      <div
        ref={box}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="relative aspect-square select-none overflow-hidden rounded-3xl bg-muted"
        style={{ touchAction: z.s > 1 ? "none" : "pan-y", cursor: z.s > 1 ? "grab" : "zoom-in" }}
      >
        <img
          key={cur} data-fly-src src={imgSrc(cur)} alt={p.name} width={816} height={816} draggable={false}
          className="gallery-img h-full w-full object-cover"
          style={{ transform: `translate(${z.x + (z.s === 1 ? dx : 0)}px, ${z.y}px) scale(${z.s})`, transition: drag ? "none" : "transform 260ms cubic-bezier(.2,.9,.3,1)" }}
        />
        {all.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {all.map((src, k) => <span key={src} className={`h-1.5 rounded-full bg-white/90 shadow transition-all ${k === idx ? "w-5" : "w-1.5 opacity-60"}`} />)}
          </div>
        )}
        {z.s === 1 && <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity [@media(hover:none)]:opacity-100">اضغط مرتين للتكبير</span>}
      </div>
      {all.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {all.map((src, k) => (
            <button key={src} onClick={() => go(k)} aria-label={`صورة ${k + 1}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${k === idx ? "border-accent" : "border-transparent"}`}>
              <img src={imgSrc(src)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
