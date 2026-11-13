import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/store";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// خريطة الموقع: الصفحات العامة + صفحة كل منتج فعّال (لا تشمل الحساب والتتبع والسلة والإدارة)
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const origin = SITE_URL || new URL(request.url).origin;
        const { data } = await supabase.from("products").select("id, created_at").eq("active", true);
        const pages = ["/", "/offers", "/about"].map((p) => ({ loc: `${origin}${p}`, lastmod: undefined as string | undefined }));
        const products = (data ?? []).map((p: { id: string; created_at?: string | null }) => ({
          loc: `${origin}/product/${p.id}`,
          lastmod: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : undefined,
        }));
        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          [...pages, ...products]
            .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
            .join("\n") +
          `\n</urlset>\n`;
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
