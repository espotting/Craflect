import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Link, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "smart_popup_shown";

interface ImportStatus {
  profileConnected: boolean;
  platforms: Array<{ platform: string; connectedAt: string; videoCount: number }>;
  lastImportedAt: string | null;
}

export function SmartPopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: status } = useQuery<ImportStatus>({
    queryKey: ["/api/user/import-status"],
    queryFn: () => fetch("/api/user/import-status", { credentials: "include" }).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: prefs } = useQuery<{ popupSkipCount?: number }>({
    queryKey: ["/api/user/me"],
    staleTime: 5 * 60 * 1000,
  });

  const skipMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/user/preferences", { popupSkipCount: (prefs?.popupSkipCount || 0) + 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/me"] }),
  });

  useEffect(() => {
    if (!status || dismissed) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const skipCount = prefs?.popupSkipCount || 0;
    if (skipCount >= 5) return;

    const noProfile = !status.profileConnected;
    const singlePlatform = status.platforms.length === 1;
    const lastImport = status.lastImportedAt ? new Date(status.lastImportedAt) : null;
    const hoursAgo = lastImport ? (Date.now() - lastImport.getTime()) / 3600000 : Infinity;

    if (noProfile || (singlePlatform && hoursAgo >= 48)) {
      // Delay 3s after page load
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [status, prefs, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, "1");
    skipMutation.mutate();
  };

  const handleConnect = () => {
    window.location.href = "/settings?tab=accounts";
  };

  if (!visible || !status) return null;

  const isExpand = status.profileConnected && status.platforms.length === 1;
  const title = isExpand ? "Expand your analysis" : "Connect your profile";
  const desc = isExpand
    ? "You're only connected to one platform. Add more to unlock cross-platform viral patterns."
    : "Craflect can analyze your existing videos to personalize your feed. Takes 30 seconds.";
  const cta = isExpand ? "Connect another platform →" : "Connect now →";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 320,
          background: "rgba(15,15,28,0.97)",
          border: "1px solid rgba(124,92,255,0.3)",
          borderRadius: 16,
          padding: "20px 20px 16px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,255,0.1)",
          zIndex: 9999,
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Close */}
        <button
          onClick={handleDismiss}
          style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 4, borderRadius: 6 }}
        >
          <X size={16} />
        </button>

        {/* Icon + title */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, background: "rgba(124,92,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isExpand ? <TrendingUp size={18} color="#7C5CFF" /> : <Link size={18} color="#7C5CFF" />}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{desc}</div>
          </div>
        </div>

        {/* Benefit pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 16 }}>
          {["Better matches", "Personalized hooks", "Higher relevance"].map(b => (
            <span key={b} style={{ fontSize: 11, padding: "4px 8px", background: "rgba(124,92,255,0.1)", border: "1px solid rgba(124,92,255,0.2)", borderRadius: 20, color: "rgba(255,255,255,0.5)" }}>{b}</span>
          ))}
        </div>

        <Button
          onClick={handleConnect}
          style={{ width: "100%", background: "linear-gradient(90deg,#7C5CFF,#c026d3)", color: "#fff", border: "none", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}
        >
          {cta}
        </Button>
        <button
          onClick={handleDismiss}
          style={{ width: "100%", background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 13, cursor: "pointer", padding: "4px 0" }}
        >
          Remind me later
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
