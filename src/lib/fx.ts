// مؤثرات التفاعل: كلها تحترم إعداد «تقليل الحركة» في الجهاز
export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const haptic = (ms = 12) => {
  try { if (!reducedMotion()) navigator.vibrate?.(ms); } catch { /* غير مدعوم */ }
};

// تطير نسخة من صورة المنتج نحو أيقونة السلة ثم تنبض الأيقونة
export function flyToCart(from?: Element | null) {
  haptic();
  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  const done = () => window.dispatchEvent(new Event("cart:bump"));
  if (!from || !target || reducedMotion() || !target.offsetParent) { done(); return; }
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!a.width || !b.width) { done(); return; }
  const size = Math.min(88, a.width);
  const ghost = document.createElement("img");
  ghost.src = (from as HTMLImageElement).currentSrc || (from as HTMLImageElement).src || "";
  Object.assign(ghost.style, {
    position: "fixed", zIndex: "120", pointerEvents: "none", objectFit: "cover", borderRadius: "18px",
    width: `${size}px`, height: `${size}px`, left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px`,
    boxShadow: "0 10px 30px rgb(0 0 0 / 35%)",
  });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 70}px) scale(.6)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0.2 },
    ],
    { duration: 650, easing: "cubic-bezier(.4,.1,.3,1)" },
  );
  const end = () => { ghost.remove(); done(); };
  anim.onfinish = end;
  anim.oncancel = end;
}
