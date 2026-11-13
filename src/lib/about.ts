import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cached, type QCtx } from "@/lib/offline";

// محتوى «من نحن والتوصيل». لا نفترض أي معلومة غير مُدخلة: الحقول الفارغة لا تُعرض.
export type AboutConfig = { intro: string; deliveryTime: string; deliveryNote: string; hours: string; address: string };
export const defaultAbout: AboutConfig = {
  intro: "نؤمّن لعيادات الأسنان المواد والأدوات التي تحتاجها لعلاج مرضاها.",
  deliveryTime: "", deliveryNote: "", hours: "", address: "",
};

export const aboutQuery = {
  queryKey: ["shop_about"],
  staleTime: 5 * 60_000,
  queryFn: ({ meta }: QCtx) =>
    cached("shop_about", async (): Promise<AboutConfig> => {
      const { data, error } = await supabase.from("shop_config").select("value").eq("key", "about").maybeSingle();
      if (error) throw error;
      const v = (data?.value ?? {}) as Partial<AboutConfig>;
      return {
        intro: String(v.intro ?? "").trim() || defaultAbout.intro,
        deliveryTime: String(v.deliveryTime ?? ""), deliveryNote: String(v.deliveryNote ?? ""),
        hours: String(v.hours ?? ""), address: String(v.address ?? ""),
      };
    }, meta),
};
export const useAbout = () => useQuery(aboutQuery);
