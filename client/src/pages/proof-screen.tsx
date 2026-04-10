import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

const NICHE_LABELS: Record<string, string> = {
  finance: "Finance",
  ai_tools: "AI Tools",
  online_business: "Online Business",
  productivity: "Productivity",
  content_creation: "Content Creation",
  entrepreneurship: "Entrepreneurship",
};

function getNicheLabel(niche: string): string {
  return NICHE_LABELS[niche] || niche.replace(/_/g, " ");
}

function ViralityBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 80
      ? "linear-gradient(90deg,#7C5CFF,#c026d3)"
      : pct >= 60
      ? "#7C5CFF"
      : pct >= 40
      ? "#3b82f6"
      : "#64748b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 4,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
            transition: "width 1s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 28, textAlign: "right" }}>
        {Math.round(pct)}
      </span>
    </div>
  );
}

function TrendBadge({ status }: { status?: string }) {
  if (status === "emerging")
    return (
      <span
        style={{
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          color: "#ef4444",
          borderRadius: 20,
          padding: "3px 10px",
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        🔥 Emerging
      </span>
    );
  if (status === "trending")
    return (
      <span
        style={{
          background: "rgba(124,92,255,0.15)",
          border: "1px solid rgba(124,92,255,0.4)",
          color: "#a78bfa",
          borderRadius: 20,
          padding: "3px 10px",
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        ⚡ Trending
      </span>
    );
  return null;
}

export default function ProofScreen() {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(0);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/proof-screen"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/proof-screen");
      return res.json();
    },
  });

  // Staggered fade-in: step 0 header, step 1 stats, step 2 patterns, step 3 cta
  useEffect(() => {
    if (!data) return;
    const timers = [
      setTimeout(() => setVisible(1), 100),
      setTimeout(() => setVisible(2), 600),
      setTimeout(() => setVisible(3), 1100),
      setTimeout(() => setVisible(4), 1700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [data]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(124,92,255,0.3)",
            borderTopColor: "#7C5CFF",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const nicheLabel = getNicheLabel(data?.niche || "");
  const stats = data?.nicheStats || {};
  const patterns = data?.topPatterns || [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        overflowY: "auto",
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(124,92,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,255,0.03) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
          pointerEvents: "none",
        }}
      />
      {/* Glow */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 400,
          background: "radial-gradient(ellipse, rgba(124,92,255,0.12), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "80px 24px 60px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Step 1 — Header */}
        <div
          style={{
            transition: "opacity 0.6s ease, transform 0.6s ease",
            opacity: visible >= 1 ? 1 : 0,
            transform: visible >= 1 ? "translateY(0)" : "translateY(16px)",
            marginBottom: 56,
            textAlign: "center" as const,
          }}
        >
          <h1 style={{ fontSize: 48, fontWeight: 700, margin: "0 0 16px", lineHeight: 1.1 }}>
            Welcome, {data?.userName}. 👋
          </h1>
          <p style={{ fontSize: 20, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            Here's what's working in{" "}
            <span style={{ color: "#a78bfa", fontWeight: 600 }}>{nicheLabel}</span> right now.
          </p>
        </div>

        {/* Step 2 — Stats cards */}
        <div
          style={{
            transition: "opacity 0.6s ease, transform 0.6s ease",
            opacity: visible >= 2 ? 1 : 0,
            transform: visible >= 2 ? "translateY(0)" : "translateY(16px)",
            marginBottom: 52,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              {
                value: parseInt(stats.total_videos) || 0,
                label: "videos analyzed in your niche",
                color: "#7C5CFF",
              },
              {
                value: parseInt(stats.new_this_week) || 0,
                label: "new viral videos this week",
                color: "#c026d3",
              },
              {
                value: data?.emergingCount || 0,
                label: "emerging patterns right now",
                color: "#ef4444",
              },
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "24px 20px",
                  textAlign: "center" as const,
                  transition: `opacity 0.5s ease ${i * 0.15}s, transform 0.5s ease ${i * 0.15}s`,
                  opacity: visible >= 2 ? 1 : 0,
                  transform: visible >= 2 ? "translateY(0)" : "translateY(12px)",
                }}
              >
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    color: card.color,
                    lineHeight: 1,
                    marginBottom: 8,
                  }}
                >
                  {card.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3 — Top patterns */}
        {patterns.length > 0 && (
          <div
            style={{
              transition: "opacity 0.6s ease, transform 0.6s ease",
              opacity: visible >= 3 ? 1 : 0,
              transform: visible >= 3 ? "translateY(0)" : "translateY(16px)",
              marginBottom: 52,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 16 }}>
              Top patterns in {nicheLabel}
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
              {patterns.map((p: any, i: number) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(124,92,255,0.06)",
                    border: "1px solid rgba(124,92,255,0.18)",
                    borderRadius: 14,
                    padding: "20px 22px",
                    transition: `opacity 0.5s ease ${i * 0.1}s`,
                    opacity: visible >= 3 ? 1 : 0,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#a78bfa", flex: 1, marginRight: 12 }}>
                      {p.pattern_label || "Pattern"}
                    </div>
                    <TrendBadge status={p.trend_status} />
                  </div>

                  {p.hook_template && (
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        background: "rgba(0,0,0,0.35)",
                        padding: "10px 12px",
                        borderRadius: 8,
                        color: "rgba(255,255,255,0.75)",
                        lineHeight: 1.6,
                        marginBottom: 10,
                      }}
                    >
                      {p.hook_template}
                    </div>
                  )}

                  {p.why_it_works && (
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 12px", lineHeight: 1.5 }}>
                      {p.why_it_works}
                    </p>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, marginRight: 16 }}>
                      <ViralityBar score={p.avg_virality_score || 0} />
                    </div>
                    <button
                      onClick={() => navigate(`/create?patternId=${p.pattern_id}`)}
                      style={{
                        background: "rgba(124,92,255,0.15)",
                        border: "1px solid rgba(124,92,255,0.35)",
                        color: "#a78bfa",
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      Use this pattern →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — CTA */}
        <div
          style={{
            transition: "opacity 0.6s ease, transform 0.6s ease",
            opacity: visible >= 4 ? 1 : 0,
            transform: visible >= 4 ? "translateY(0)" : "translateY(16px)",
            textAlign: "center" as const,
          }}
        >
          <button
            onClick={() => window.location.href = "/home"}
            style={{
              background: "linear-gradient(90deg,#7C5CFF,#c026d3)",
              color: "#fff",
              border: "none",
              fontSize: 18,
              fontWeight: 600,
              padding: "16px 48px",
              borderRadius: 14,
              cursor: "pointer",
              boxShadow: "0 0 40px rgba(124,92,255,0.3)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 60px rgba(124,92,255,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(124,92,255,0.3)";
            }}
          >
            Enter my intelligence feed →
          </button>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 12 }}>
            Updated daily · Personalized to your niche
          </p>
        </div>
      </div>
    </div>
  );
}
