import instruments from "@/assets/p-instruments.jpg";
import composite from "@/assets/p-composite.jpg";
import handpiece from "@/assets/p-handpiece.jpg";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  bulkPrice: number; // per-unit price when ordering 10+
  image: string;
  description: string;
};

export const categories = ["الكل", "أدوات يدوية", "مواد ترميمية", "قبضات وأجهزة", "تعقيم ووقاية"];

export const products: Product[] = [
  { id: "exam-kit", name: "طقم أدوات فحص (مرآة، مسبر، ملقط)", brand: "DentPro", category: "أدوات يدوية", price: 18, bulkPrice: 15, image: instruments, description: "ستانلس ستيل طبي قابل للتعقيم بالأوتوكلاف، مقابض مخرشة لثبات أعلى." },
  { id: "composite-kit", name: "كمبوزيت ضوئي — طقم 5 ألوان", brand: "Restora", category: "مواد ترميمية", price: 65, bulkPrice: 55, image: composite, description: "كمبوزيت نانو هجين بألوان A1–B2، تلميع ممتاز ومقاومة عالية للاهتراء." },
  { id: "turbine", name: "قبضة توربين سريعة مع إضاءة LED", brand: "TurboDent", category: "قبضات وأجهزة", price: 240, bulkPrice: 215, image: handpiece, description: "رأس سيراميكي، رذاذ رباعي، ضجيج منخفض، وصلة 4 ثقوب." },
  { id: "probe-set", name: "مسابر لثوية مدرجة — 3 قطع", brand: "DentPro", category: "أدوات يدوية", price: 22, bulkPrice: 18, image: instruments, description: "تدريج واضح بالليزر لقياس دقيق لعمق الجيوب." },
  { id: "bond", name: "مادة رابطة عالمية 5 مل", brand: "Restora", category: "مواد ترميمية", price: 38, bulkPrice: 32, image: composite, description: "رابط من الجيل الثامن، يعمل بتقنيات الحفر الكلي والذاتي." },
  { id: "contra", name: "قبضة زاوية بطيئة 1:1", brand: "TurboDent", category: "قبضات وأجهزة", price: 160, bulkPrice: 140, image: handpiece, description: "مناسبة للتحضير والتلميع، متوافقة مع جميع المحركات القياسية." },
  { id: "gloves", name: "قفازات نتريل — علبة 100", brand: "SafeHand", category: "تعقيم ووقاية", price: 7, bulkPrice: 5.5, image: instruments, description: "خالية من البودرة واللاتكس، مقاومة عالية للتمزق." },
  { id: "sterile-pouch", name: "أكياس تعقيم ذاتية الإغلاق — 200", brand: "SafeHand", category: "تعقيم ووقاية", price: 12, bulkPrice: 9, image: composite, description: "مؤشر لوني للتعقيم، مقاسات متعددة." },
];

export const unitPrice = (p: Product, qty: number) => (qty >= 10 ? p.bulkPrice : p.price);
export const fmt = (n: number) => `$${n.toFixed(2)}`;
