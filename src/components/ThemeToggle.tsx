import { Moon, Sun } from "lucide-react";
import { useDark } from "@/lib/theme";

export function ThemeToggle() {
  const { dark, toggle } = useDark();
  const label = dark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن";
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card hover:bg-muted">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
