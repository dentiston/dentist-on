import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/lib/customer";
import type { Product } from "@/lib/products";

export type Promo = {
  id: string; name: string; percent: number; scope: "all" | "category" | "product"; target: string | null;
  code: string | null; min_order: number; starts_at: string | null; ends_at: string | null;
  max_uses: number | null; used_count: number; active: boolean;
};

export const promoMatches = (x: { scope: string; target: string | null }, p: Product) =>
  x.scope === "all" || (x.scope === "category" && x.target === p.category) || (x.scope === "product" && x.target === p.id);

export const isLive = (x: Promo, now = Date.now()) =>
  x.active && (!x.starts_at || new Date(x.starts_at).getTime() <= now) && (!x.ends_at || new Date(x.ends_at).getTime() > now) &&
  (x.max_uses == null || x.used_count < x.max_uses);

// أعلى نسبة بين الخصومات التلقائية السارية على المنتج
export const autoPercent = (p: Product, promos: Promo[]) =>
  Math.max(0, ...promos.filter((x) => !x.code && isLive(x) && promoMatches(x, p)).map((x) => Number(x.percent)));

// الخصومات التلقائية فقط؛ أكواد القسائم لا تصل للمتصفح إلا عبر التحقق من الكود
export const usePromotions = () =>
  useQuery({
    queryKey: ["promos"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").is("code", null);
      if (error) throw error;
      return data as unknown as Promo[];
    },
  });

// النسبة الفعلية لمنتج: الأفضل للزبون بين خصمه الخاص والخصومات التلقائية (لا تتراكم)
export function useDiscounts() {
  const { data: promos = [] } = usePromotions();
  const { customer } = useCustomer();
  const own = customer?.status === "approved" ? Number(customer.discount_percent ?? 0) : 0;
  return (p: Product) => Math.max(own, autoPercent(p, promos));
}
