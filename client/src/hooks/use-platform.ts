import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export type Platform = "all" | "tiktok" | "instagram" | "youtube" | "reels" | "shorts";

const STORAGE_KEY = "craflect_platform";
const VALID: Platform[] = ["all", "tiktok", "instagram", "youtube", "reels", "shorts"];

export function usePlatform() {
  const { data: prefs } = useQuery<{ active_platform?: string; platforms?: string[] }>({
    queryKey: ["/api/user/preferences"],
    staleTime: 10 * 60 * 1000,
  });

  const [platform, setPlatformState] = useState<Platform>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Platform;
      return stored && VALID.includes(stored) ? stored : "tiktok";
    } catch {
      return "tiktok";
    }
  });

  // Sync from DB prefs once loaded
  useEffect(() => {
    if (prefs?.active_platform && VALID.includes(prefs.active_platform as Platform)) {
      setPlatformState(prefs.active_platform as Platform);
    }
  }, [prefs?.active_platform]);

  const setPlatform = (p: Platform) => {
    setPlatformState(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch {}
  };

  return { platform, setPlatform };
}
