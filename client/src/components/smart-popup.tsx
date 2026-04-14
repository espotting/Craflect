import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Link, TrendingUp, BarChart2, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const SESSION_KEY = "smart_popup_shown";

interface ImportStatus {
  profileConnected: boolean;
  platforms: Array<{ platform: string; connectedAt: string; videoCount: number }>;
  lastImportedAt: string | null;
  popupSkipCount?: number;
  popupLastShown?: string | null;
}

export function SmartPopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();

  const { data: status } = useQuery<ImportStatus>({
    queryKey: ["/api/user/import-status"],
    queryFn: () => fetch("/api/user/import-status", { credentials: "include" }).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const skipMutation = useMutation({
    mutationFn: (count: number) => apiRequest("PATCH", "/api/user/preferences", { popupSkipCount: count }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/import-status"] }),
  });

  useEffect(() => {
    if (!status || dismissed) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const skipCount = status.popupSkipCount || 0;
    if (skipCount >= 5) return;

    const lastShown = status.popupLastShown ? new Date(status.popupLastShown) : null;
    const daysSince = lastShown ? (Date.now() - lastShown.getTime()) / (1000 * 60 * 60 * 24) : 999;
    const platforms = status.platforms || [];
    const noProfile = !status.profileConnected;
    const singlePlatform = platforms.length === 1;

    // Show on first 3 skips always; thereafter once/week
    const shouldShow = (noProfile || (singlePlatform))
      && (skipCount < 3 || daysSince >= 7);

    if (shouldShow) {
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [status, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, "1");
    if (status) {
      skipMutation.mutate((status.popupSkipCount || 0) + 1);
    }
  };

  const handleConnect = () => {
    setVisible(false);
    window.location.href = "/settings?tab=accounts";
  };

  if (!visible || !status) return null;

  const platforms = status.platforms || [];
  const isExpand = status.profileConnected && platforms.length === 1;
  const title = isExpand ? "Expand your analysis" : "Connect your profile";
  const desc = isExpand
    ? "You're connected to one platform. Add more to unlock cross-platform viral patterns."
    : "Craflect can analyze your existing videos to personalize your content signals. Takes 30 seconds.";
  const cta = isExpand ? "Connect another platform →" : "Connect now →";

  const valueProps = [
    { icon: BarChart2, label: "Better matches", desc: "Personalized to your content" },
    { icon: Zap, label: "Viral hooks", desc: "Based on your performance" },
    { icon: TrendingUp, label: "Higher relevance", desc: "Patterns that fit you" },
    { icon: Link, label: "Cross-platform", desc: "TikTok · Reels · Shorts" },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={handleDismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#13131f', border: '1px solid rgba(124,92,255,0.25)',
          borderRadius: 20, padding: '40px 48px', maxWidth: 520, width: '90%',
          textAlign: 'center', position: 'relative',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,92,255,0.1)',
        }}
      >
        {/* Close */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center',
          }}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
          background: 'linear-gradient(135deg,rgba(124,92,255,0.25),rgba(192,38,211,0.15))',
          border: '1px solid rgba(124,92,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isExpand ? <TrendingUp size={26} color="#a78bfa" /> : <Link size={26} color="#a78bfa" />}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 22, fontWeight: 800, color: '#fff',
          letterSpacing: '-0.02em', marginBottom: 10, margin: '0 0 10px',
        }}>
          {title}
        </h2>

        {/* Description */}
        <p style={{
          fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
          marginBottom: 24, margin: '0 0 24px',
        }}>
          {desc}
        </p>

        {/* Value props 2×2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28,
        }}>
          {valueProps.map(vp => (
            <div key={vp.label} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10, padding: '12px 14px', textAlign: 'left',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <vp.icon size={16} color="#7C5CFF" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>
                  {vp.label}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  {vp.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <button
          onClick={handleConnect}
          style={{
            width: '100%', background: 'linear-gradient(90deg,#7C5CFF,#c026d3)',
            border: 'none', color: '#fff', padding: '13px 0', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
          }}
        >
          {cta}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            width: '100%', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.25)', fontSize: 13,
            cursor: 'pointer', padding: '6px 0',
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
