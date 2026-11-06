import { useEffect, useState } from "react";

export function IntroSplash() {
  const [stage, setStage] = useState(0); // 0 off, 1 on, 2 fading, 3 gone
  useEffect(() => {
    if (sessionStorage.getItem("intro-seen")) { setStage(3); return; }
    const t1 = setTimeout(() => setStage(1), 900);
    const t2 = setTimeout(() => setStage(2), 2600);
    const t3 = setTimeout(() => { setStage(3); sessionStorage.setItem("intro-seen", "1"); }, 3400);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);
  if (stage === 3) return null;
  const on = stage >= 1;
  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-primary transition-opacity duration-700 ${stage === 2 ? "opacity-0" : "opacity-100"}`}
    >
      <div className="relative h-80 w-40 rounded-full border-[6px] border-primary-foreground/90 bg-primary p-2 shadow-2xl">
        <div className="flex h-full w-full flex-col items-center justify-between rounded-full border-2 border-primary-foreground/80 py-8">
          <svg
            viewBox="0 0 100 120"
            className="w-24 transition-all duration-500"
            style={{
              filter: on ? "drop-shadow(0 0 14px var(--accent)) drop-shadow(0 0 30px var(--accent))" : "none",
              opacity: on ? 1 : 0.15,
            }}
          >
            <path
              d="M40 105 v-12 c0 -8 -28 -18 -28 -45 a38 38 0 1 1 76 0 c0 20 -14 30 -30 30 c-14 0 -20 -10 -20 -20 a10 10 0 0 1 20 0 c0 12 -12 14 -18 8"
              fill="none"
              stroke={on ? "var(--accent)" : "var(--muted-foreground)"}
              strokeWidth="10"
              strokeLinecap="round"
              className="transition-colors duration-500"
            />
          </svg>
          <span
            className={`text-5xl font-black tracking-wide text-primary-foreground transition-all duration-500 ${on ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            ON
          </span>
        </div>
      </div>
    </div>
  );
}
