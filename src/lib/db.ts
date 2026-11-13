import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// عميل غير مقيّد بالأنواع: الجداول الجديدة (distributors, used_items, service_requests) تعمل
// حتى قبل تحديث types.ts. بعد «حدّث ملف types.ts» يمكن استبداله بـ supabase مباشرة.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sb = supabase as unknown as SupabaseClient<any>;

// رفع صورة إلى حاوية request-images (نفس مسار «اسأل عن مادة») وإرجاع الرابط العام
export async function uploadUserImage(userId: string, file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > 3 * 1024 * 1024) throw new Error("size");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("request-images").upload(path, file, { contentType: file.type });
  if (error) throw new Error("upload");
  return supabase.storage.from("request-images").getPublicUrl(path).data.publicUrl;
}
