import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ShopConfig = { minOrder: number; zones: Record<string, number>; lowStock: number };

// قواعد المتجر العامة: الحد الأدنى للطلب، رسوم التوصيل حسب المنطقة، حد تنبيه المخزون
export const configQuery = {
  queryKey: ["shop_config"],
  staleTime: 60_000,
  queryFn: async (): Promise<ShopConfig> => {
    const { data, error } = await supabase.from("shop_config").select("key, value");
    if (error) throw error;
    const m: Record<string, unknown> = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    const z = m["delivery_fees"];
    return {
      minOrder: Number(m["min_order_usd"] ?? 0) || 0,
      zones: z && typeof z === "object" ? (z as Record<string, number>) : {},
      lowStock: Number(m["low_stock_threshold"] ?? 5) || 0,
    };
  },
};
export const useShopConfig = () => useQuery(configQuery);
