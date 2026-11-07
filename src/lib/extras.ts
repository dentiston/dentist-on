import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const REQUEST_STATUSES = ["جديد", "متوفرة", "غير متوفرة", "ستتوفر قريباً"] as const;

// الأكثر طلباً: عدد القطع المباعة آخر 90 يوماً. إن لم يُنفَّذ SQL بعد، يعمل المتجر بدونها.
export const useBestSellers = () =>
  useQuery({
    queryKey: ["best_sellers"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("best_sellers");
      if (error) return {} as Record<string, number>;
      return Object.fromEntries((data ?? []).map((r) => [r.product_id, Number(r.qty)])) as Record<string, number>;
    },
  });

// قائمة «أعلمني عند التوفر» للزبون الحالي
export function useWatch(userId?: string) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["my-watch", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_watch").select("product_id").eq("user_id", userId!);
      if (error) throw error;
      return data.map((r) => r.product_id);
    },
  });
  const watching = new Set(q.data ?? []);
  const toggle = async (productId: string) => {
    if (!userId) return;
    const on = watching.has(productId);
    const { error } = on
      ? await supabase.from("stock_watch").delete().eq("user_id", userId).eq("product_id", productId)
      : await supabase.from("stock_watch").insert({ user_id: userId, product_id: productId });
    if (error) { toast.error("تعذّر الحفظ، حاول مجددًا"); return; }
    toast.success(on ? "أُلغيت المتابعة" : "سنُعلمك فور توفر المنتج");
    qc.invalidateQueries({ queryKey: ["my-watch", userId] });
  };
  return { watching, toggle };
}
