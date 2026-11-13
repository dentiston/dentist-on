import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { sb } from "@/lib/db";
import { useCustomer } from "@/lib/customer";
import { useProductReviews, useReviewStats } from "@/lib/reviews";

export function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex text-amber-500" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`${className} ${n <= Math.round(value) ? "fill-current" : "opacity-30"}`} />)}
    </span>
  );
}

// نجوم ومتوسط صغير للبطاقة (يختفي إن لم توجد تقييمات)
export function RatingBadge({ id }: { id: string }) {
  const s = useReviewStats().data?.[id];
  if (!s || s.n === 0) return null;
  return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Stars value={s.avg} className="h-3 w-3" /> {s.avg} ({s.n})</span>;
}

export function ProductReviews({ productId }: { productId: string }) {
  const { session, customer } = useCustomer();
  const qc = useQueryClient();
  const { data: reviews = [], isLoading, isError } = useProductReviews(productId);
  const mine = reviews.find((r) => r.user_id === session?.user.id);
  const visible = reviews.filter((r) => !r.hidden);
  const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const canReview = !!session && customer?.status === "approved";
  const refresh = () => { qc.invalidateQueries({ queryKey: ["reviews", productId] }); qc.invalidateQueries({ queryKey: ["review_stats"] }); };
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-black">آراء الأطباء</h2>
        {visible.length > 0 && <span className="flex items-center gap-2 text-sm"><Stars value={avg} /> <b>{avg.toFixed(1)}</b> <span className="text-muted-foreground">({visible.length} تقييم)</span></span>}
      </div>
      {isLoading && <p className="mt-3 text-muted-foreground">جارِ التحميل…</p>}
      {isError && <p className="mt-3 text-muted-foreground">تعذّر تحميل التقييمات (تحتاج اتصالاً بالإنترنت).</p>}
      {!isLoading && !isError && visible.length === 0 && <p className="mt-3 text-muted-foreground">لا توجد تقييمات بعد. كن أول من يشارك رأيه.</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {visible.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <b>{r.author || "طبيب معتمد"}</b>
              <Stars value={r.rating} />
            </div>
            {r.verified && <div className="mt-1 flex items-center gap-1 text-xs font-bold text-accent"><BadgeCheck className="h-3.5 w-3.5" /> اشترى هذا المنتج</div>}
            {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(r.created_at).toLocaleDateString("ar")}</span>
              {r.user_id === session?.user.id && (
                <button className="text-destructive underline" onClick={async () => { if (!confirm("حذف تقييمك؟")) return; const { error } = await sb.from("product_reviews").delete().eq("id", r.id); if (error) toast.error("تعذّر الحذف"); else refresh(); }}>حذف تقييمي</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 max-w-xl rounded-2xl bg-secondary p-4">
        {!session ? (
          <p className="text-sm">التقييم للأطباء المعتمدين. <Link to="/account" className="font-bold text-primary underline">سجّل أو ادخل إلى حسابك</Link></p>
        ) : !canReview ? (
          <p className="text-sm">يُفتح التقييم بعد موافقة الإدارة على حسابك.</p>
        ) : (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            if (rating < 1) { toast.error("اختر عدد النجوم"); return; }
            setBusy(true);
            const { error } = await sb.rpc("submit_review", { p_product: productId, p_rating: rating, p_comment: comment });
            setBusy(false);
            if (error) { toast.error("تعذّر حفظ التقييم"); return; }
            toast.success(mine ? "تم تحديث تقييمك" : "شكراً لمشاركتك رأيك");
            setComment(""); setRating(0); refresh();
          }}>
            <div className="font-bold">{mine ? "عدّل تقييمك" : "قيّم هذا المنتج"}</div>
            <div className="flex gap-1" role="radiogroup" aria-label="التقييم">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} نجوم`} onClick={() => setRating(n)} className="text-amber-500">
                  <Star className={`h-7 w-7 ${n <= rating ? "fill-current" : "opacity-30"}`} />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} rows={3} placeholder="رأيك بالمنتج (اختياري)" className="w-full rounded-xl border border-input bg-card px-3 py-2" />
            <button disabled={busy} className="rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground disabled:opacity-60">{busy ? "جارِ الحفظ…" : "نشر التقييم"}</button>
          </form>
        )}
      </div>
    </section>
  );
}
