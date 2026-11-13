import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/db";
import { absUrl } from "@/lib/store";

const KEY = "dentist-on-ref";
export const normCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);

export const saveRef = (code: string) => { try { const c = normCode(code); if (c) localStorage.setItem(KEY, c); } catch { /* */ } };
export const readRef = () => { try { return normCode(localStorage.getItem(KEY) ?? ""); } catch { return ""; } };
export const clearRef = () => { try { localStorage.removeItem(KEY); } catch { /* */ } };

export const refLink = (code: string) => absUrl(`/account?ref=${encodeURIComponent(code)}`);
export const refMessage = (name: string, link: string) =>
  `مرحباً ${name}، هذا رابط الإحالة الخاص بك في Dentist On:\n${link}\nأرسله لأطبائك المعتمدين، وكل طبيب يسجّل من خلاله يصبح تابعاً لك.`;
export const genCode = () => `D${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

// اسم الموزع من الكود (للعرض في صفحة التسجيل)
export const useDistributorName = (code: string) =>
  useQuery({
    queryKey: ["dist-name", code],
    enabled: !!code,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc("distributor_by_code", { p_code: code });
      if (error) throw error;
      return (Array.isArray(data) ? data[0]?.name : null) as string | null;
    },
  });

// اسم موزّع الطبيب الحالي
export const useMyDistributor = (enabled: boolean) =>
  useQuery({
    queryKey: ["my-distributor"],
    enabled,
    queryFn: async () => {
      const { data, error } = await sb.rpc("my_distributor");
      if (error) throw error;
      return (Array.isArray(data) ? data[0]?.name : null) as string | null;
    },
  });
