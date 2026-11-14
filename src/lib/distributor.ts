import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/db";
import { absUrl } from "@/lib/store";

export type PortalInfo = { id: string; name: string; phone: string; code: string; active: boolean; created_at: string };
export type PortalDoctor = { user_id: string; clinic_name: string; phone: string; status: string; created_at: string; orders_count: number; orders_total: number; last_order: string | null };
export type PortalOrder = { id: string; created_at: string; clinic_name: string; total: number; status: string };

// رابط دعوة يولّده المدير فقط: /distributor?invite=المفتاح (لمرة واحدة، صالح 7 أيام)
export const portalLink = () => absUrl("/distributor");
export const inviteLink = (token: string) => absUrl(`/distributor?invite=${encodeURIComponent(token)}`);
export const portalMessage = (name: string, token?: string) =>
  token
    ? `مرحباً ${name}، فتحنا لك بوابة الموزع في Dentist On.\nافتح هذا الرابط لإنشاء حسابك (يعمل لمرة واحدة ولمدة 7 أيام):\n${inviteLink(token)}\nستجد فيها أطباءك وطلباتهم ومبيعاتهم ورابط الإحالة الخاص بك.`
    : `مرحباً ${name}، رابط بوابة الموزع في Dentist On للدخول:\n${portalLink()}`;
const INV = "dentist-on-dist-invite";
export const rememberInvite = (t: string) => { try { localStorage.setItem(INV, t); } catch { /* تجاهل */ } };
export const readInvite = () => { try { return localStorage.getItem(INV) || ""; } catch { return ""; } };
export const clearInvite = () => { try { localStorage.removeItem(INV); } catch { /* تجاهل */ } };
export const doctorInviteMessage = (link: string) =>
  `مرحباً دكتور، سجّل عيادتك في Dentist On (مواد وأدوات سنية بأسعار الجملة) من هذا الرابط:\n${link}`;

export const useMyPortal = (enabled: boolean) =>
  useQuery({
    queryKey: ["portal-info"], enabled,
    queryFn: async () => {
      const { data, error } = await sb.rpc("my_distributor_portal");
      if (error) throw error;
      return ((Array.isArray(data) ? data[0] : null) ?? null) as PortalInfo | null;
    },
  });
export const usePortalDoctors = (enabled: boolean) =>
  useQuery({
    queryKey: ["portal-doctors"], enabled, refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc("distributor_doctors");
      if (error) throw error;
      return ((data ?? []) as PortalDoctor[]).map((d) => ({ ...d, orders_count: Number(d.orders_count), orders_total: Number(d.orders_total) }));
    },
  });
export const usePortalOrders = (enabled: boolean) =>
  useQuery({
    queryKey: ["portal-orders"], enabled, refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc("distributor_orders", { p_limit: 500 });
      if (error) throw error;
      return ((data ?? []) as PortalOrder[]).map((o) => ({ ...o, total: Number(o.total) }));
    },
  });
