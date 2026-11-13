import { beforeEach, describe, expect, it } from "vitest";
import { diffCart, isPending, mergeMax, needsSyncConfirm, sameCart, setPendingFlag } from "./cart-sync";
import { cached, extractAssetUrls, extractFontCssUrls, extractFontFileUrls, readMeta, writeMeta } from "./offline";

beforeEach(() => localStorage.clear());

describe("مزامنة السلة", () => {
  it("يقارن السلتين متجاهلاً الكميات الصفرية", () => {
    expect(sameCart({ a: 1, b: 0 }, { a: 1 })).toBe(true);
    expect(sameCart({ a: 1 }, { a: 2 })).toBe(false);
  });
  it("الدمج يأخذ الأكبر كمية ويحتفظ بالعناصر من الطرفين", () => {
    expect(mergeMax({ a: 1, b: 5 }, { a: 3, c: 2 })).toEqual({ a: 3, b: 5, c: 2 });
  });
  it("الفروق تُظهر المضاف والمحذوف والمعدَّل فقط", () => {
    const d = diffCart({ a: 2, b: 1 }, { a: 2, c: 4 });
    expect(d).toEqual([{ id: "b", device: 1, account: 0 }, { id: "c", device: 0, account: 4 }]);
  });
  it("علم التغييرات المعلّقة يُحفظ ويُمسح", () => {
    expect(isPending()).toBe(false);
    setPendingFlag(true);
    expect(isPending()).toBe(true);
    setPendingFlag(false);
    expect(isPending()).toBe(false);
  });
});

describe("زر تأكيد المزامنة (الحالتان)", () => {
  const base = { loggedIn: true, online: true, pending: true, serverCart: { a: 1 } };
  it("دون اتصال: لا يظهر الزر حتى مع تغييرات معلّقة", () => {
    expect(needsSyncConfirm({ ...base, online: false })).toBe(false);
  });
  it("عودة الاتصال مع تغييرات معلّقة وسلة حساب: يظهر", () => {
    expect(needsSyncConfirm(base)).toBe(true);
  });
  it("لا يظهر لزائر، ولا بلا تغييرات، ولا قبل وصول سلة الحساب", () => {
    expect(needsSyncConfirm({ ...base, loggedIn: false })).toBe(false);
    expect(needsSyncConfirm({ ...base, pending: false })).toBe(false);
    expect(needsSyncConfirm({ ...base, serverCart: null })).toBe(false);
  });
});

describe("لقطة التسوق دون اتصال", () => {
  it("دون تنزيل سابق: الخطأ يُرمى ولا لقطة", async () => {
    await expect(cached("k", async () => { throw new Error("net"); })).rejects.toThrow("net");
  });
  it("بعد التنزيل: النجاح يحدّث اللقطة والفشل يعيدها", async () => {
    writeMeta({ at: 1, products: 1, pages: 1, files: 1, images: 1, failed: 0 });
    expect(readMeta()?.products).toBe(1);
    expect(await cached("k", async () => [1, 2])).toEqual([1, 2]);
    expect(await cached("k", async () => { throw new Error("net"); })).toEqual([1, 2]);
  });
  it("وضع strict لا يرجع للّقطة القديمة", async () => {
    writeMeta({ at: 1, products: 1, pages: 1, files: 1, images: 1, failed: 0 });
    await cached("k", async () => "old");
    await expect(cached("k", async () => { throw new Error("net"); }, { strict: true })).rejects.toThrow("net");
  });
});

describe("استخراج الملفات", () => {
  it("يلتقط ملفات assets من HTML وJS", () => {
    const html = '<script src="/assets/index-AbC.js"></script><link href="/assets/styles-1.css">';
    expect(extractAssetUrls(html).sort()).toEqual(["/assets/index-AbC.js", "/assets/styles-1.css"]);
    const js = 'import("./cart-x9.js");m=["assets/cart-x9.js","assets/hero-q.jpg"]';
    expect(extractAssetUrls(js).sort()).toEqual(["/assets/cart-x9.js", "/assets/hero-q.jpg"]);
  });
  it("يلتقط رابط خط Google وملفاته", () => {
    const html = '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&amp;display=swap">';
    expect(extractFontCssUrls(html)).toEqual(["https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap"]);
    expect(extractFontFileUrls("src: url(https://fonts.gstatic.com/s/cairo/v1/a.woff2) format('woff2')")).toEqual(["https://fonts.gstatic.com/s/cairo/v1/a.woff2"]);
  });
});
