import { useEffect, useState } from "react";

export function IntroSplash() {
  const [stage, setStage] = useState(0); // 0 dark, 1 switch shows, 2 flip, 3 on, 4 fade, 5 gone
  useEffect(() => {
    if (sessionStorage.getItem("intro-seen")) { setStage(5); return; }
    const ts = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1300),
      setTimeout(() => setStage(3), 1700),
      setTimeout(() => setStage(4), 3300),
      setTimeout(() => { setStage(5); sessionStorage.setItem("intro-seen", "1"); }, 4100),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  if (stage === 5) return null;
  const visible = stage >= 1;
  const flipped = stage >= 2;
  const on = stage >= 3;
  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-primary transition-opacity duration-700 ${stage === 4 ? "opacity-0" : "opacity-100"}`}
      style={{ perspective: "800px" }}
    >
      <div
        className="relative h-80 w-40 rounded-full border-[6px] bg-primary p-2"
        style={{
          borderColor: visible ? "color-mix(in oklch, var(--primary-foreground) 85%, transparent)" : "transparent",
          transform: flipped ? "rotateX(14deg) translateY(4px)" : "rotateX(-14deg) translateY(-4px)",
          transition: "transform 0.35s cubic-bezier(.5,1.8,.5,1), border-color 0.8s",
          boxShadow: on ? "0 0 60px color-mix(in oklch, var(--accent) 35%, transparent)" : "none",
        }}
      >
        <div
          className="flex h-full w-full flex-col items-center justify-between rounded-full border-2 py-8 transition-colors duration-700"
          style={{ borderColor: visible ? "color-mix(in oklch, var(--primary-foreground) 70%, transparent)" : "transparent" }}
        >
          <svg
            viewBox="0 0 100 120"
            className="w-24 transition-all duration-500"
            style={{
              filter: on ? "drop-shadow(0 0 14px var(--accent)) drop-shadow(0 0 30px var(--accent))" : "none",
              opacity: on ? 1 : 0,
            }}
          >
            <path
              d="M40 105 v-12 c0 -8 -28 -18 -28 -45 a38 38 0 1 1 76 0 c0 20 -14 30 -30 30 c-14 0 -20 -10 -20 -20 a10 10 0 0 1 20 0 c0 12 -12 14 -18 8"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="10"
              strokeLinecap="round"
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
