import { useState, useEffect } from "react";

export type Platform = "all" | "tiktok" | "instagram" | "youtube";

const STORAGE_KEY = "craflect_platform";

export function usePlatform() {
  const [platform, setPlatformState] = useState<Platform>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Platform;
      return stored && ["all", "tiktok", "instagram", "youtube"].includes(stored) ? stored : "all";
    } catch {
      return "all";
    }
  });

  const setPlatform = (p: Platform) => {
    setPlatformState(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch {}
  };

  return { platform, setPlatform };
}
