import { useEffect } from "react";
import type { ThemePref } from "@/store";

/** Always applies dark mode. */
export function useApplyTheme(_pref: ThemePref) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
}
