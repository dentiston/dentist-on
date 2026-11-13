import type { Product } from "@/lib/products";

export const BUNDLE_CATEGORY = "العروض والبكجات";
export const AUDIENCES = { students: "طلاب الجامعات", clinics: "العيادات", all: "للجميع" } as const;
export type Audience = keyof typeof AUDIENCES;
export type BundleItem = { id: string; qty: number };

export const isBundle = (p: Product) => Array.isArray(p.bundle_items) && p.bundle_items.length > 0;
export const bundleParts = (p: Product, all: Product[]) =>
  (p.bundle_items ?? []).map((it) => ({ ...it, product: all.find((x) => x.id === it.id) })).filter((x) => !!x.product);
// قيمة المكوّنات بالأسعار المفردة، للمقارنة مع سعر الباقة
export const bundleValue = (p: Product, all: Product[]) =>
  bundleParts(p, all).reduce((s, x) => s + Number(x.product!.price) * x.qty, 0);
