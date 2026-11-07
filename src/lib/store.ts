// رقم واتساب المتجر بالصيغة الدولية بلا + (مثال: 963944000000). يُضبط في VITE_WHATSAPP_NUMBER.
export const WA_NUMBER = String(import.meta.env["VITE_WHATSAPP_NUMBER"] ?? "").replace(/\D/g, "");

export const waLink = (text: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

export function orderMessage(ref: string, name: string, lines: { name: string; qty: number }[], totalLabel: string) {
  return [
    `طلب جديد #${ref.slice(0, 8).toUpperCase()}`,
    `الاسم: ${name}`,
    ...lines.map((l) => `- ${l.name} × ${l.qty}`),
    `الإجمالي: ${totalLabel}`,
  ].join("\n");
}

// الرقم المحلي (09xxxxxxxx) → دولي. غيّر DEFAULT_CC إن لم يكن المتجر في سوريا.
const DEFAULT_CC = "963";
export function intlPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("0")) return DEFAULT_CC + d.slice(1);
  return d;
}
export const waLinkTo = (phone: string, text: string) => `https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(text)}`;
export const approvalMessage = (clinic: string, url: string) =>
  `مرحباً ${clinic}، تمت الموافقة على حسابك في Dentist On. يمكنك الآن تسجيل الدخول وإكمال طلبك من السلة: ${url}`;

export function statusMessage(name: string, ref: string, status: string) {
  const r = `#${ref.slice(0, 8).toUpperCase()}`;
  const body: Record<string, string> = {
    "جديد": `استلمنا طلبك ${r} وسنؤكده قريباً.`,
    "قيد التجهيز": `طلبك ${r} قيد التجهيز الآن.`,
    "تم الشحن": `تم شحن طلبك ${r} وهو في الطريق إليك.`,
    "مكتمل": `تم إكمال طلبك ${r}. شكراً لثقتك بـ Dentist On.`,
    "ملغي": `تم إلغاء طلبك ${r}. للاستفسار تواصل معنا.`,
  };
  return `مرحباً ${name}، ${body[status] ?? `حالة طلبك ${r}: ${status}`}`;
}

// رقم هاتف: أرقام لاتينية و + ومسافات وشرطات (9–16 خانة)
export const PHONE_PATTERN = "[0-9+\\s\\-]{9,16}";

export function reminderMessage(name: string, lines: { name: string; qty: number }[], url: string) {
  return [
    `مرحباً ${name}، لاحظنا أن سلتك في Dentist On ما زالت تنتظر:`,
    ...lines.map((l) => `- ${l.name} × ${l.qty}`),
    `هل تحتاج مساعدة لإكمال الطلب؟ ${url}`,
  ].join("\n");
}

// عنوان الموقع المنشور (مثال https://dentist-on.lovable.app) لروابط المشاركة وصور المعاينة.
// يُضبط في VITE_SITE_URL؛ وإلا يُؤخذ من المتصفح.
export const SITE_URL = String(import.meta.env["VITE_SITE_URL"] ?? "").replace(/\/$/, "");
export const absUrl = (path: string) =>
  `${SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")}${path}`;
