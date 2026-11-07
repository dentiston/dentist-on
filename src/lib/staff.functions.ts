import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// إنشاء حسابات الموظفين يحتاج مفتاح الخدمة، لذلك يتم على الخادم فقط وبعد التأكد أن المستدعي مدير.
const PERMS = ["orders", "requests", "customers"] as const;
const phone = z.string().trim().regex(/^[0-9+\s-]{9,16}$/, "invalid phone");
const permissions = z.array(z.enum(PERMS)).min(1).max(PERMS.length);
const password = z.string().min(8).max(72);

type Ctx = { supabase: SupabaseClient<Database>; userId: string; claims: { email?: unknown } };

async function requireAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

async function audit(ctx: Ctx, action: "insert" | "update" | "delete", entityId: string, details: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_log").insert({
    user_id: ctx.userId,
    user_email: typeof ctx.claims.email === "string" ? ctx.claims.email : null,
    action, entity: "staff", entity_id: entityId, details: details as never,
  });
}

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ email: z.string().trim().toLowerCase().email().max(254), password, phone, permissions }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { must_change_password: true, staff: true },
    });
    if (error || !created.user) throw new Error(/already|registered|exists/i.test(error?.message ?? "") ? "email exists" : "create failed");
    const id = created.user.id;
    try {
      // قد ينشئ المشغّل سجل «زبون» لكل حساب جديد؛ الموظف ليس زبوناً
      await supabaseAdmin.from("customers").delete().eq("user_id", id);
      const r1 = await supabaseAdmin.from("user_roles").insert({ user_id: id, role: "staff" });
      if (r1.error) throw r1.error;
      const r2 = await supabaseAdmin.from("staff_profiles").insert({ user_id: id, email: data.email, phone: data.phone, permissions: data.permissions });
      if (r2.error) throw r2.error;
    } catch {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
      await supabaseAdmin.auth.admin.deleteUser(id);
      throw new Error("create failed");
    }
    await audit(context, "insert", id, { name: data.email, permissions: data.permissions });
    return { id };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), phone, permissions, password: password.optional() }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("staff_profiles").select("email").eq("user_id", data.userId).maybeSingle();
    if (!prof) throw new Error("not staff");
    const { error } = await supabaseAdmin.from("staff_profiles").update({ phone: data.phone, permissions: data.permissions }).eq("user_id", data.userId);
    if (error) throw new Error("update failed");
    if (data.password) {
      const r = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        password: data.password, user_metadata: { must_change_password: true, staff: true },
      });
      if (r.error) throw new Error("update failed");
    }
    await audit(context, "update", data.userId, { name: prof.email, permissions: data.permissions, password_reset: !!data.password });
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("not allowed");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("staff_profiles").select("email").eq("user_id", data.userId).maybeSingle();
    if (!prof) throw new Error("not staff"); // لا يُحذف إلا حساب موظف مسجّل هنا، أبداً مدير
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("staff_profiles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("delete failed");
    await audit(context, "delete", data.userId, { name: prof.email });
    return { ok: true };
  });
