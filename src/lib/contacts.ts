import { waLinkTo } from "@/lib/store";

// أرقام التواصل (واتساب). تُحوَّل تلقائياً للصيغة الدولية عبر intlPhone في store.ts
export const SUPPORT_PHONE = "0939215019"; // قسم الشكاوى والدعم
export const ORDERS_PHONE = "0985674064"; // الطلب المباشر، متابعة الطلب، طلب الصيانة

export const supportLink = (who?: string) =>
  waLinkTo(SUPPORT_PHONE, `مرحباً Dentist On${who ? `، أنا ${who}` : ""}.\nلدي شكوى / أحتاج دعماً بخصوص: `);
export const ordersLink = (topic = "طلب مباشر", who?: string) =>
  waLinkTo(ORDERS_PHONE, `مرحباً Dentist On${who ? `، أنا ${who}` : ""}.\nأريد: ${topic}\n`);
