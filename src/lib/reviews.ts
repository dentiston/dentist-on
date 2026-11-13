import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/db";
import { cached, type QCtx } from "@/lib/offline";

export type Review = { id: string; product_id: string; user_id: string; author: string; rating: number; comment: string; verified: boolean; hidden: boolean; created_at: string };

// متوسط التقييم لكل منتج (للبطاقات). إن لم يُنفَّذ SQL بعد يعمل المتجر بدونها.
export const reviewStatsQuery = {
  queryKey: ["review_stats"],
  staleTime: 10 * 60_000,
  queryFn: ({ meta }: QCtx) =>
    cached("review_stats", async () => {
      const { data, error } = await sb.rpc("review_stats");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r: { product_id: string; avg_rating: number; n: number }) => [r.product_id, { avg: Number(r.avg_rating), n: Number(r.n) }])) as Record<string, { avg: number; n: number }>;
    }, meta).catch(() => ({}) as Record<string, { avg: number; n: number }>),
};
export const useReviewStats = () => useQuery(reviewStatsQuery);

export const useProductReviews = (productId: string) =>
  useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await sb.from("product_reviews").select("*").eq("product_id", productId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });
