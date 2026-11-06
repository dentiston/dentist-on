import { useEffect, useState } from "react";

export function IntroSplash() {
  const [stage, setStage] = useState(0); // dark → switch → slide upward → light → fade
  useEffect(() => {
    if (sessionStorage.getItem("intro-seen")) { setStage(5); return; }
    const ts = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => setStage(3), 2000),
      setTimeout(() => setStage(4), 3200),
      setTimeout(() => { setStage(5); sessionStorage.setItem("intro-seen", "1"); }, 3900),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  if (stage === 5) return null;
  return (
    <div
      className="intro-splash fixed inset-0 z-[100] grid place-items-center"
      data-stage={stage}
      aria-hidden="true"
    >
      <div className="intro-mark flex flex-col items-center gap-7">
        <svg viewBox="0 0 100 120" className="intro-bulb h-24 w-20">
          <path
            d="M40 105 v-12 c0 -8 -28 -18 -28 -45 a38 38 0 1 1 76 0 c0 20 -14 30 -30 30 c-14 0 -20 -10 -20 -20 a10 10 0 0 1 20 0 c0 12 -12 14 -18 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </div>
        <div className="intro-switch">
          <div className="intro-switch-knob" />
        </div>
        <span className="intro-on text-5xl font-black">ON</span>
      </div>
    </div>
  );
}
