import { Share2 } from "lucide-react";
import { absUrl } from "@/lib/store";

// مشاركة رابط المنتج على واتساب؛ المعاينة (صورة + اسم) تأتي من وسوم og في صفحة المنتج
export function ShareButton({ id, name }: { id: string; name: string }) {
  const href = `https://wa.me/?text=${encodeURIComponent(`${name}\n${absUrl(`/product/${id}`)}`)}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold">
      <Share2 className="h-4 w-4" /> مشاركة على واتساب
    </a>
  );
}
