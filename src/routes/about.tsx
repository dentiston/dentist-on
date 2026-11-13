import { createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { useAbout } from "@/lib/about";
import { useShopConfig } from "@/lib/config";
import { ORDERS_PHONE, SUPPORT_PHONE, ordersLink, supportLink } from "@/lib/contacts";
import { Price } from "@/components/Price";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن والتوصيل | Dentist On" },
      { name: "description", content: "تعرّف على Dentist On: من نحن، مناطق التوصيل ورسومه ومدته، وطرق التواصل." },
      { property: "og:title", content: "من نحن والتوصيل | Dentist On" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: about } = useAbout();
  const { data: cfg } = useShopConfig();
  const zones = Object.entries(cfg?.zones ?? {});
  const min = cfg?.minOrder ?? 0;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">من نحن</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{about?.intro}</p>
      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-secondary p-4">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" />
        <p className="text-sm">نبيع للأطباء والعيادات المعتمدة فقط: تُراجَع الحسابات قبل تفعيلها، وتُحتسب الأسعار بسعر الصرف لحظة تأكيد الطلب.</p>
      </div>

      <h2 className="mt-10 flex items-center gap-2 text-2xl font-black"><Truck className="h-6 w-6" /> التوصيل</h2>
      <div className="mt-4 space-y-3">
        {zones.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-muted px-4 py-2 text-sm font-bold">المناطق ورسوم التوصيل</div>
            <ul className="divide-y divide-border">
              {zones.map(([z, fee]) => (
                <li key={z} className="flex justify-between px-4 py-2"><span>{z}</span><b>{Number(fee) === 0 ? "مجاني" : <Price usd={Number(fee)} usdToo={false} />}</b></li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">تفاصيل رسوم التوصيل تُؤكَّد معك عند تثبيت الطلب.</p>
        )}
        {min > 0 && <p className="text-sm">الحد الأدنى للطلب: <b><Price usd={min} usdToo={false} /></b></p>}
        {about?.deliveryTime && <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" /> مدة التوصيل: <b>{about.deliveryTime}</b></p>}
        {about?.deliveryNote && <p className="text-sm text-muted-foreground">{about.deliveryNote}</p>}
      </div>

      {(about?.hours || about?.address) && (
        <div className="mt-8 space-y-2">
          {about.hours && <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" /> ساعات العمل: <b>{about.hours}</b></p>}
          {about.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /> {about.address}</p>}
        </div>
      )}

      <h2 className="mt-10 text-2xl font-black">تواصل معنا</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a href={supportLink()} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-[#25D366] px-4 py-3 font-bold text-black"><MessageCircle className="h-5 w-5" /><span>الشكاوى والدعم<span className="block text-xs" dir="ltr">{SUPPORT_PHONE}</span></span></a>
        <a href={ordersLink("طلب مباشر / متابعة طلب")} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-[#25D366] px-4 py-3 font-bold text-black"><MessageCircle className="h-5 w-5" /><span>طلب مباشر · متابعة · صيانة<span className="block text-xs" dir="ltr">{ORDERS_PHONE}</span></span></a>
      </div>
    </main>
  );
}
