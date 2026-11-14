import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, EyeOff, GripVertical, Maximize2, Palette, Plus, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NAV } from "@/components/AdminShell";

// ===== تخطيط مركز التحكم: مجموعات (تسمّيها أنت) تحوي بطاقات (كل بطاقة تفتح صفحة قسم) =====
export type Group = { id: string; name: string; cards: string[]; closed?: boolean };
export type Layout = { groups: Group[]; hidden: string[]; wide: string[]; colors: Record<string, string> };

const LKEY = "dentist-on-admin-layout";
const REMOTE_KEY = "admin_layout";
const COLORS = ["#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#f43f5e", "#14b8a6"];

const defaultLayout = (): Layout => {
  const order: string[] = [];
  for (const n of NAV) if (n.id !== "hub" && !order.includes(n.group)) order.push(n.group);
  return {
    groups: order.map((g, i) => ({ id: `g${i}`, name: g, cards: NAV.filter((n) => n.group === g && n.id !== "hub").map((n) => n.id) })),
    hidden: [], wide: ["orders"], colors: {},
  };
};

// يدمج التخطيط المحفوظ مع الأقسام المتاحة: يحذف المجهول ويضيف الجديد في آخر مجموعة
const normalize = (l: Layout | null, ids: string[]): Layout => {
  const base = l && Array.isArray(l.groups) && l.groups.length ? l : defaultLayout();
  const all = NAV.filter((n) => n.id !== "hub").map((n) => n.id);
  const seen = new Set<string>();
  const groups = base.groups.map((g) => ({ ...g, cards: g.cards.filter((c) => all.includes(c) && !seen.has(c) && !!seen.add(c)) }));
  const missing = all.filter((c) => !seen.has(c));
  if (missing.length) groups[groups.length - 1]!.cards.push(...missing);
  void ids;
  return { groups, hidden: (base.hidden ?? []).filter((c) => all.includes(c)), wide: (base.wide ?? []).filter((c) => all.includes(c)), colors: base.colors ?? {} };
};

function useLayout(canSync: boolean, ids: string[]) {
  const [layout, setLayout] = useState<Layout>(() => normalize(null, ids));
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    let off = false;
    let local: Layout | null = null;
    try { local = JSON.parse(localStorage.getItem(LKEY) || "null"); } catch { /* افتراضي */ }
    if (local) setLayout(normalize(local, ids));
    (async () => {
      if (canSync) {
        const { data } = await supabase.from("shop_config").select("value").eq("key", REMOTE_KEY).maybeSingle();
        if (!off && data?.value) setLayout(normalize(data.value as unknown as Layout, ids));
      }
      ready.current = true;
    })().catch(() => { ready.current = true; });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSync]);
  const save = useCallback((next: Layout) => {
    setLayout(next);
    try { localStorage.setItem(LKEY, JSON.stringify(next)); } catch { /* تجاهل */ }
    if (!canSync) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!ready.current) return;
      const { error } = await supabase.from("shop_config").upsert({ key: REMOTE_KEY, value: next as never });
      if (error) toast.error("حُفظ الترتيب على هذا الجهاز فقط (تعذّر حفظه في حسابك)");
    }, 700);
  }, [canSync]);
  return [layout, save] as const;
}

export function AdminCards({ items, badges, go, canEdit, extra }: {
  items: string[]; badges: Record<string, number>; go: (t: string) => void; canEdit: boolean; extra?: Record<string, string>;
}) {
  const [layout, save] = useLayout(canEdit, items);
  const [edit, setEdit] = useState(false);
  const drag = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const avail = useMemo(() => new Set(items), [items]);

  const move = (id: string, toGroup: string, before?: string) => {
    const groups = layout.groups.map((g) => ({ ...g, cards: g.cards.filter((c) => c !== id) }));
    const t = groups.find((g) => g.id === toGroup);
    if (!t) return;
    const at = before ? t.cards.indexOf(before) : -1;
    if (at >= 0) t.cards.splice(at, 0, id); else t.cards.push(id);
    save({ ...layout, groups });
  };
  const shift = (gid: string, id: string, d: -1 | 1) => {
    const groups = layout.groups.map((g) => {
      if (g.id !== gid) return g;
      const c = [...g.cards]; const i = c.indexOf(id); const j = i + d;
      if (i < 0 || j < 0 || j >= c.length) return g;
      [c[i], c[j]] = [c[j]!, c[i]!];
      return { ...g, cards: c };
    });
    save({ ...layout, groups });
  };
  const toggle = (key: "hidden" | "wide", id: string) => save({ ...layout, [key]: layout[key].includes(id) ? layout[key].filter((x) => x !== id) : [...layout[key], id] });
  const color = (id: string, c: string) => { const colors = { ...layout.colors }; if (c) colors[id] = c; else delete colors[id]; save({ ...layout, colors }); };
  const patchGroup = (gid: string, p: Partial<Group>) => save({ ...layout, groups: layout.groups.map((g) => (g.id === gid ? { ...g, ...p } : g)) });
  const shiftGroup = (gid: string, d: -1 | 1) => {
    const g = [...layout.groups]; const i = g.findIndex((x) => x.id === gid); const j = i + d;
    if (i < 0 || j < 0 || j >= g.length) return;
    [g[i], g[j]] = [g[j]!, g[i]!]; save({ ...layout, groups: g });
  };
  const addGroup = () => {
    const name = prompt("اسم المجموعة الجديدة");
    if (name?.trim()) save({ ...layout, groups: [...layout.groups, { id: `g${Date.now()}`, name: name.trim(), cards: [] }] });
  };
  const delGroup = (gid: string) => {
    if (layout.groups.length < 2) { toast.error("يجب أن تبقى مجموعة واحدة على الأقل"); return; }
    const g = layout.groups.find((x) => x.id === gid); if (!g) return;
    if (g.cards.length && !confirm("ستنتقل بطاقات هذه المجموعة إلى المجموعة الأولى. متابعة؟")) return;
    const rest = layout.groups.filter((x) => x.id !== gid);
    rest[0] = { ...rest[0]!, cards: [...rest[0]!.cards, ...g.cards] };
    save({ ...layout, groups: rest });
  };

  const renderCard = (g: Group, id: string) => {
    const n = NAV.find((x) => x.id === id);
    if (!n || !avail.has(id)) return null;
    const hidden = layout.hidden.includes(id);
    if (hidden && !edit) return null;
    const wide = layout.wide.includes(id);
    const c = layout.colors[id];
    const count = badges[id] ?? 0;
    const Icon = n.icon;
    const style = c ? { background: `color-mix(in oklch, ${c} 13%, var(--card))`, borderColor: `color-mix(in oklch, ${c} 55%, transparent)` } : undefined;
    return (
      <div
        key={id}
        draggable={edit}
        onDragStart={(e) => { drag.current = id; e.dataTransfer.effectAllowed = "move"; }}
        onDragEnd={() => { drag.current = null; setOver(null); }}
        onDragOver={(e) => { if (edit && drag.current && drag.current !== id) { e.preventDefault(); setOver(id); } }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (drag.current && drag.current !== id) move(drag.current, g.id, id); drag.current = null; setOver(null); }}
        className={`relative ${wide ? "col-span-2 sm:col-span-2" : ""} ${over === id ? "ring-2 ring-accent" : ""} ${hidden ? "opacity-45" : ""}`}
      >
        <button
          type="button" onClick={() => !edit && go(id)} style={style}
          className={`admin-card card-spot group relative flex h-full min-h-[116px] w-full flex-col items-start justify-between gap-2 overflow-hidden rounded-3xl border border-border bg-card p-4 text-start transition ${edit ? "cursor-grab" : "hover:-translate-y-1 hover:shadow-lg active:scale-[.98]"}`}
          onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`); }}
        >
          <div className="flex w-full items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl text-accent-foreground transition group-hover:scale-110" style={{ background: c || "var(--accent)" }}><Icon className="h-5 w-5" /></span>
            {!edit && count > 0 && <span className="admin-pulse rounded-full bg-accent px-2.5 py-0.5 text-sm font-black text-accent-foreground">{count}</span>}
            {edit && <GripVertical className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div>
            <div className="font-black leading-tight">{n.label}</div>
            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{extra?.[id] ?? n.hint}</div>
          </div>
        </button>
        {edit && (
          <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-center gap-1 rounded-2xl bg-card/95 p-1.5 text-xs shadow-lg backdrop-blur">
            <button type="button" onClick={() => shift(g.id, id, -1)} aria-label="قبل" className="grid h-7 w-7 place-items-center rounded-lg bg-muted"><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></button>
            <button type="button" onClick={() => shift(g.id, id, 1)} aria-label="بعد" className="grid h-7 w-7 place-items-center rounded-lg bg-muted"><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></button>
            <select value={g.id} onChange={(e) => move(id, e.target.value)} aria-label="نقل إلى مجموعة" className="h-7 max-w-[7rem] rounded-lg border border-input bg-card px-1">
              {layout.groups.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <button type="button" onClick={() => toggle("wide", id)} aria-pressed={wide} aria-label="بطاقة عريضة" className={`grid h-7 w-7 place-items-center rounded-lg ${wide ? "bg-primary text-primary-foreground" : "bg-muted"}`}><Maximize2 className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => toggle("hidden", id)} aria-label={hidden ? "إظهار" : "إخفاء"} className="grid h-7 w-7 place-items-center rounded-lg bg-muted">{hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
            <span className="flex items-center gap-1 pr-1"><Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <button type="button" onClick={() => color(id, "")} aria-label="لون افتراضي" className={`h-4 w-4 rounded-full border border-border bg-card ${!c ? "ring-2 ring-foreground" : ""}`} />
              {COLORS.map((k) => <button key={k} type="button" onClick={() => color(id, k)} aria-label={`لون ${k}`} className={`h-4 w-4 rounded-full ${c === k ? "ring-2 ring-foreground" : ""}`} style={{ background: k }} />)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mt-5 space-y-6">
      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{edit ? "اسحب البطاقات بين المجموعات، أو استخدم أزرار النقل. ما تغيّره يُحفظ تلقائياً." : "اضغط بطاقة لفتح صفحتها."}</p>
          <div className="flex gap-2">
            {edit && <button type="button" onClick={() => { if (confirm("إعادة الترتيب الافتراضي؟")) save(defaultLayout()); }} className="flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-sm font-bold"><RotateCcw className="h-4 w-4" /> افتراضي</button>}
            <button type="button" onClick={() => setEdit((v) => !v)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 ${edit ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
              {edit ? <><Check className="h-4 w-4" /> تم</> : <><Settings2 className="h-4 w-4" /> تخصيص</>}
            </button>
          </div>
        </div>
      )}
      {layout.groups.map((g) => {
        const cards = g.cards.filter((id) => avail.has(id) && (edit || !layout.hidden.includes(id)));
        if (!edit && cards.length === 0) return null;
        const alerts = g.cards.reduce((s, id) => s + (avail.has(id) ? badges[id] ?? 0 : 0), 0);
        return (
          <div key={g.id} onDragOver={(e) => { if (edit && drag.current) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); if (drag.current) move(drag.current, g.id); drag.current = null; setOver(null); }}>
            <div className="mb-3 flex items-center gap-2">
              <button type="button" onClick={() => patchGroup(g.id, { closed: !g.closed })} aria-expanded={!g.closed} className="flex items-center gap-2 text-lg font-black">
                <ChevronDown className={`h-4 w-4 transition ${g.closed ? "-rotate-90" : ""}`} />
                {edit ? <input value={g.name} onClick={(e) => e.stopPropagation()} onChange={(e) => patchGroup(g.id, { name: e.target.value })} aria-label="اسم المجموعة" className="rounded-lg border border-input bg-card px-2 py-0.5 text-base" /> : g.name}
              </button>
              {g.closed && alerts > 0 && <span className="admin-pulse rounded-full bg-accent px-2 text-xs font-black text-accent-foreground">{alerts}</span>}
              <span className="h-px flex-1 bg-border" />
              {edit && (
                <span className="flex gap-1">
                  <button type="button" onClick={() => shiftGroup(g.id, -1)} aria-label="المجموعة للأعلى" className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => shiftGroup(g.id, 1)} aria-label="المجموعة للأسفل" className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => delGroup(g.id)} aria-label="حذف المجموعة" className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
                </span>
              )}
            </div>
            {!g.closed && (
              <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${edit ? "pb-0 [&>div]:pb-14" : ""}`}>
                {cards.map((id) => renderCard(g, id))}
                {edit && cards.length === 0 && <div className="col-span-full rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">اسحب بطاقة إلى هنا</div>}
              </div>
            )}
          </div>
        );
      })}
      {edit && <button type="button" onClick={addGroup} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 font-bold text-muted-foreground transition hover:bg-muted"><Plus className="h-4 w-4" /> مجموعة جديدة</button>}
    </section>
  );
}
