import lightLogo from "@/assets/logo-light.png";
import darkLogo from "@/assets/logo-dark.png";

// نسختان من الشعار؛ يختار CSS الظاهرة حسب الوضع فلا يلزم JavaScript ولا يحدث وميض
export function Logo({ className = "" }: { className?: string }) {
  return (
    <>
      <img src={lightLogo} alt="Dentist On" width={1000} height={332} className={`${className} dark:hidden`} />
      <img src={darkLogo} alt="" aria-hidden="true" width={1000} height={332} className={`${className} hidden dark:block`} />
    </>
  );
}
