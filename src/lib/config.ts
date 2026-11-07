import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomeConfig = {
  announcement: { enabled: boolean; text: string };
  hero: { title: string; subtitle: string; button: string; image: string };
  featured: string[];
  previous: boolean;
};
// الجزء بين نجمتين في العنوان يظهر بلون التمييز
export const defaultHome: HomeConfig = {
  announcement: { enabled: false, text: "" },
  hero: {
    title: "كل ما تحتاجه عيادتك، *بضغطة واحدة*",
    subtitle: "منصة Dentist On لشراء المواد والأدوات السنية بأسعار الجملة للأطباء والعيادات والمخابر.",
    button: "تسوّق الآن",
    image: "",
  },
  featured: [],
  previous: true,
};

export type ShopConfig = { minOrder: number; zones: Record<string, number>; lowStock: number; home: HomeConfig };

// قواعد المتجر العامة: الحد الأدنى للطلب، رسوم التوصيل حسب المنطقة، حد تنبيه المخزون
export const configQuery = {
  queryKey: ["shop_config"],
  staleTime: 60_000,
  queryFn: async (): Promise<ShopConfig> => {
    const { data, error } = await supabase.from("shop_config").select("key, value");
    if (error) throw error;
    const m: Record<string, unknown> = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    const z = m["delivery_fees"];
    const h = (m["home"] ?? {}) as Partial<HomeConfig>;
    const home: HomeConfig = {
      announcement: { ...defaultHome.announcement, ...h.announcement },
      hero: { ...defaultHome.hero, ...h.hero },
      featured: Array.isArray(h.featured) ? h.featured : [],
      previous: h.previous ?? true,
    };
    return {
      minOrder: Number(m["min_order_usd"] ?? 0) || 0,
      zones: z && typeof z === "object" ? (z as Record<string, number>) : {},
      lowStock: Number(m["low_stock_threshold"] ?? 5) || 0,
      home,
    };
  },
};
export const useShopConfig = () => useQuery(configQuery);
