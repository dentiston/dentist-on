import { describe, expect, it } from "vitest";
import { catalogLine, idsFromGatewayReply, normQuery, pickValidIds } from "./search-core";

const allowed = new Set(["a1", "b2", "c3"]);

describe("البحث الذكي: لا اختراع منتجات", () => {
  it("يُسقط أي معرّف غير موجود في الكتالوج ويزيل التكرار", () => {
    expect(pickValidIds(["b2", "ghost", "b2", "a1", 7, null], allowed)).toEqual(["b2", "a1"]);
  });
  it("مخرجات غير مصفوفة تعني لا نتائج", () => {
    expect(pickValidIds("a1", allowed)).toEqual([]);
    expect(pickValidIds(undefined, allowed)).toEqual([]);
  });
  it("يحترم الحد الأقصى", () => {
    expect(pickValidIds(["a1", "b2", "c3"], allowed, 2)).toEqual(["a1", "b2"]);
  });
  it("يقرأ رد البوابة، ورد معطوب يعطي قائمة فارغة", () => {
    const ok = { choices: [{ message: { tool_calls: [{ function: { arguments: '{"ids":["a1","x"]}' } }] } }] };
    expect(pickValidIds(idsFromGatewayReply(ok), allowed)).toEqual(["a1"]);
    expect(pickValidIds(idsFromGatewayReply({ choices: [{ message: { content: "نص حر" } }] }), allowed)).toEqual([]);
    expect(pickValidIds(idsFromGatewayReply({ choices: [{ message: { tool_calls: [{ function: { arguments: "{bad" } }] } }] }), allowed)).toEqual([]);
  });
  it("سطر الكتالوج لا يحمل سعراً ولا يكسر الفاصل", () => {
    const l = catalogLine({ id: "p1", name: "كمبوزيت | نانو", brand: "Restora", category: "مواد", description: "سطر\nثانٍ" });
    expect(l).toBe("p1 | كمبوزيت / نانو | Restora | مواد | سطر ثانٍ");
    expect(normQuery("  حشو   ضرس \n ")).toBe("حشو ضرس");
  });
});
