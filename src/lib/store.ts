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
