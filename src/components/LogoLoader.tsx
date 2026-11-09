// مؤشر التحميل برمز المتجر (المصباح) — نفس رسم شاشة الافتتاح لكن بنبض خفيف
export function LogoLoader({ label = "جارِ التحميل…", className = "py-16" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center gap-3 text-muted-foreground ${className}`}>
      <svg viewBox="0 0 100 120" aria-hidden="true" className="h-14 w-12 animate-pulse text-accent">
        <path
          d="M40 105 v-12 c0 -8 -28 -18 -28 -45 a38 38 0 1 1 76 0 c0 20 -14 30 -30 30 c-14 0 -20 -10 -20 -20 a10 10 0 0 1 20 0 c0 12 -12 14 -18 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}
