import { fmt } from "@/lib/products";

export type InvoiceOrder = {
  id: string; customer_name: string; phone: string; address: string; created_at: string;
  items: { name: string; qty: number; unit: number }[]; total: number; paid?: boolean | null;
  total_syp?: number | null; exchange_rate?: number | null; delivery_fee?: number | null; zone?: string | null;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

// يفتح نافذة فاتورة ويطبعها. كل نص قادم من الزبون يُهرَّب لمنع حقن HTML.
export function printInvoice(o: InvoiceOrder): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const ref = o.id.slice(0, 8).toUpperCase();
  const items = o.items ?? [];
  const sub = items.reduce((s, i) => s + Number(i.unit) * Number(i.qty), 0);
  const fee = Number(o.delivery_fee ?? 0);
  const rows = items.map((i, k) =>
    `<tr><td>${k + 1}</td><td>${esc(i.name)}</td><td>${esc(i.qty)}</td><td>${fmt(Number(i.unit))}</td><td>${fmt(Number(i.unit) * Number(i.qty))}</td></tr>`).join("");
  const syp = Number(o.total_syp ?? 0) > 0
    ? `<div>بالليرة السورية: <b>${Math.round(Number(o.total_syp)).toLocaleString("en-US")} ل.س</b> (1$ = ${Number(o.exchange_rate).toLocaleString("en-US")})</div>` : "";
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${ref}</title>
<style>
body{font-family:system-ui,"Segoe UI",Tahoma,sans-serif;margin:32px;color:#111}
h1{margin:0;font-size:28px}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px}
.meta{margin:16px 0;line-height:1.9}table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #bbb;padding:8px;text-align:right}th{background:#f2f2f2}
.sum{margin-top:16px;margin-right:auto;width:max-content;line-height:2}.tot{font-size:20px}
.stamp{margin-top:24px;font-weight:bold}@media print{body{margin:12mm}}
</style></head><body>
<div class="top"><div><h1>Dentist On</h1><div>فاتورة بيع</div></div>
<div style="text-align:left" dir="ltr">No. <b>${ref}</b><br>${esc(new Date(o.created_at).toLocaleDateString("en-GB"))}</div></div>
<div class="meta"><div>العميل: <b>${esc(o.customer_name)}</b></div><div>الهاتف: <span dir="ltr">${esc(o.phone)}</span></div>
<div>العنوان: ${esc(o.address)}${o.zone ? ` — ${esc(o.zone)}` : ""}</div></div>
<table><thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead><tbody>${rows}</tbody></table>
<div class="sum"><div>المجموع الفرعي: ${fmt(sub)}</div>${fee > 0 ? `<div>رسوم التوصيل: ${fmt(fee)}</div>` : ""}
<div class="tot">الإجمالي: <b>${fmt(Number(o.total))}</b></div>${syp}</div>
<div class="stamp">${o.paid ? "الحالة: مدفوعة" : "الحالة: غير مدفوعة"}</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
