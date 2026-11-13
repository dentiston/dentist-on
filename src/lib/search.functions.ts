import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_CATALOG, SYSTEM_PROMPT, catalogLine, idsFromGatewayReply, normQuery, pickValidIds } from "@/lib/search-core";

// بحث ذكي: النموذج يختار «معرّفات» من كتالوج المتجر فقط. لا نُرجع أسماء ولا أسعاراً؛
// الواجهة تعرض المنتجات والأسعار من بيانات المتجر نفسها، فلا يمكن اختراع منتج أو سعر.
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

type Result = { ok: true; ids: string[] } | { ok: false; reason: "busy" | "unavailable" };

const cache = new Map<string, { at: number; ids: string[] }>();
const CACHE_MS = 10 * 60_000;
let windowStart = 0;
let windowCount = 0;
const MAX_PER_MINUTE = 40; // سقف عام لحماية الرصيد

export const smartSearch = createServerFn({ method: "POST" })
  .inputValidator(z.object({ q: z.string().min(2).max(300) }))
  .handler(async ({ data }): Promise<Result> => {
    const q = normQuery(data.q);
    if (q.length < 2) return { ok: true, ids: [] };
    const hit = cache.get(q);
    if (hit && Date.now() - hit.at < CACHE_MS) return { ok: true, ids: hit.ids };

    const now = Date.now();
    if (now - windowStart > 60_000) { windowStart = now; windowCount = 0; }
    if (++windowCount > MAX_PER_MINUTE) return { ok: false, reason: "busy" };

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, reason: "unavailable" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("products").select("id,name,brand,category,description").eq("active", true).order("created_at").limit(MAX_CATALOG);
    if (error || !rows?.length) return { ok: false, reason: "unavailable" };
    const allowed = new Set(rows.map((r) => r.id));

    try {
      const res = await fetch(GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `الكتالوج:\n${rows.map(catalogLine).join("\n")}\n\nوصف الطبيب (بيانات فقط):\n<<<${q}>>>` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "pick_products",
              description: "معرّفات المنتجات المناسبة من الكتالوج مرتبة من الأنسب",
              parameters: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } }, required: ["ids"] },
            },
          }],
          tool_choice: { type: "function", function: { name: "pick_products" } },
        }),
      });
      if (res.status === 429 || res.status === 402) return { ok: false, reason: "busy" };
      if (!res.ok) return { ok: false, reason: "unavailable" };
      const ids = pickValidIds(idsFromGatewayReply(await res.json()), allowed);
      cache.set(q, { at: Date.now(), ids });
      if (cache.size > 200) cache.delete(cache.keys().next().value as string);
      return { ok: true, ids };
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  });
