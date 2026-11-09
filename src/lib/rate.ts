import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cached, type QCtx } from "@/lib/offline";

// سعر الدولار بالليرة السورية. القيمة 0 تعني "غير محدد" فتُعرض الأسعار بالدولار فقط.
export const rateQuery = {
  queryKey: ["usd_to_syp"],
  staleTime: 5 * 60_000,
  queryFn: ({ meta }: QCtx) =>
    cached("usd_to_syp", async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("value, updated_at")
        .eq("key", "usd_to_syp")
        .maybeSingle();
      if (error) throw error;
      return { rate: Number(data?.value ?? 0), updatedAt: data?.updated_at ?? null };
    }, meta),
};
export const useRate = () => useQuery(rateQuery);

export const fmtSyp = (usd: number, rate: number) =>
  `${Math.round(usd * rate).toLocaleString("en-US")} ل.س`;
