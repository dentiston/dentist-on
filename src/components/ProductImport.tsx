import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/products";
import { parseCsv, toCsv } from "@/lib/csv";

const ALIASES: Record<string, string[]> = {
  id: ["id", "sku", "الرمز", "رمز المنتج", "المعرف"],
  name: ["name", "اسم المنتج", "الاسم", "المنتج"],
  brand: ["brand", "الماركة", "العلامة"],
  category: ["category", "التصنيف", "الفئة"],
  price: ["price", "السعر", "سعر القطعة"],
  bulk_price: ["bulk_price", "سعر الجملة", "الجملة"],
  description: ["description", "الوصف"],
  stock: ["stock", "المخزون", "الكمية"],
  image: ["image", "الصورة", "رابط الصورة"],
  active: ["active", "ظاهر", "فعال"],
};
const en = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
const num = (s: string) => Number(en(s).replace(/[,٬\s]/g, ""));

function build(rows: string[][]): { ok: Product[]; errs: string[]; fatal?: string } {
  if (rows.length < 2) return { ok: [], errs: [], fatal: "الملف فارغ أو بلا صفوف بيانات" };
  const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const col: Record<string, number> = {};
  for (const [k, names] of Object.entries(ALIASES)) {
    const i = head.findIndex((h) => names.includes(h));
    if (i >= 0) col[k] = i;
  }
  if (col["name"] === undefined || col["price"] === undefined) return { ok: [], errs: [], fatal: "يجب وجود عمودي «اسم المنتج» و«السعر» في الصف الأول" };
  const ok: Product[] = [];
  const errs: string[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const g = (k: string) => (col[k] === undefined ? "" : (r[col[k]] ?? "").trim());
    const name = g("name");
    const price = num(g("price"));
    if (!name) { errs.push(`سطر ${line}: الاسم فارغ`); return; }
    if (!Number.isFinite(price) || price < 0) { errs.push(`سطر ${line}: سعر غير صالح`); return; }
    const bulkRaw = g("bulk_price");
    const bulk = bulkRaw === "" ? price : num(bulkRaw);
    if (!Number.isFinite(bulk) || bulk < 0) { errs.push(`سطر ${line}: سعر الجملة غير صالح`); return; }
    const stockRaw = g("stock");
    const stock = stockRaw === "" ? null : Math.floor(num(stockRaw));
    if (stock !== null && (!Number.isFinite(stock) || stock < 0)) { errs.push(`سطر ${line}: مخزون غير صالح`); return; }
    const id = g("id") || `p-${Date.now().toString(36)}${idx}`;
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) { errs.push(`سطر ${line}: الرمز يقبل أحرفاً إنجليزية وأرقاماً و - و _ فقط`); return; }
    if (seen.has(id)) { errs.push(`سطر ${line}: الرمز مكرر داخل الملف`); return; }
    seen.add(id);
    ok.push({
      id, name, brand: g("brand"), category: g("category") || "أدوات يدوية", price, bulk_price: bulk,
      image: g("image") || "instruments", description: g("description"), stock,
      active: !["0", "false", "no", "لا", "مخفي"].includes(g("active").toLowerCase()),
    });
  });
  return { ok, errs };
}

export function ProductImport({ onDone }: { onDone: () => void }) {
  const [ready, setReady] = useState<Product[]>([]);
  const [errs, setErrs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const template = () => {
    const csv = toCsv([
      ["id", "اسم المنتج", "الماركة", "التصنيف", "السعر", "سعر الجملة", "المخزون", "الوصف", "الصورة", "ظاهر"],
      ["gloves-m", "قفازات نتريل مقاس M — علبة 100", "SafeHand", "تعقيم ووقاية", "7", "5.5", "200", "خالية من البودرة", "", "1"],
      ["bur-set", "طقم سنابل ألماس", "DentPro", "أدوات يدوية", "25", "21", "", "10 قطع", "", "1"],
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "products-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const { ok, errs: e, fatal } = build(parseCsv(await file.text()));
    if (fatal) { toast.error(fatal); setReady([]); setErrs([]); return; }
    setReady(ok); setErrs(e);
  };

  const run = async () => {
    setBusy(true);
    for (let i = 0; i < ready.length; i += 100) {
      const { error } = await supabase.from("products").upsert(ready.slice(i, i + 100).map((p) => ({ ...p, images: p.images ?? [] })));
      if (error) { setBusy(false); toast.error(`توقف الاستيراد: ${error.message}`); return; }
    }
    setBusy(false);
    toast.success(`تم استيراد ${ready.length} منتج`);
    setReady([]); setErrs([]);
    if (fileRef.current) fileRef.current.value = "";
    onDone();
  };

  return (
    <div className="mb-4 rounded-2xl bg-secondary p-4">
      <div className="font-bold">استيراد منتجات من ملف CSV</div>
      <p className="mt-1 text-xs text-muted-foreground">من إكسل: ملف ← حفظ باسم ← CSV UTF-8. الصف الأول عناوين الأعمدة. الرمز (id) الموجود يُحدَّث، والجديد يُضاف.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={template} className="rounded-full bg-muted px-4 py-2 text-sm">تنزيل نموذج</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
      </div>
      {(ready.length > 0 || errs.length > 0) && (
        <div className="mt-3 text-sm">
          <div>صالح للاستيراد: <b>{ready.length}</b> · بأخطاء: <b className={errs.length ? "text-destructive" : ""}>{errs.length}</b></div>
          {errs.slice(0, 5).map((m) => <div key={m} className="text-xs text-destructive">{m}</div>)}
          {errs.length > 5 && <div className="text-xs text-muted-foreground">… و{errs.length - 5} أخطاء أخرى</div>}
          {ready.length > 0 && (
            <button type="button" disabled={busy} onClick={run} className="mt-3 rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-60">
              {busy ? "جارِ الاستيراد…" : `استيراد ${ready.length} منتج`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
