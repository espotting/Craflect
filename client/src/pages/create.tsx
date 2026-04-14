import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ChevronLeft, Sparkles } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pattern {
  id: string;
  pattern_label: string | null;
  hook_template: string | null;
  structure_template: string | null;
  optimal_duration: number | null;
  why_it_works: string | null;
  best_for: string | null;
  cta_suggestion: string | null;
  avg_virality_score: number | null;
  topic_cluster: string | null;
  trend_status: string | null;
  velocity_7d: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractVars(template: string | null): string[] {
  if (!template) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of template.matchAll(/\[([^\]]+)\]/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); out.push(m[1]); }
  }
  return out;
}

function fillTemplate(template: string | null, values: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\[([^\]]+)\]/g, (_, k) => values[k] || `[${k}]`);
}

function formatDuration(n: number | null): string {
  return n ? `${n}s` : "47s";
}

function buildTimeline(duration: number | null) {
  const d = duration || 47;
  const h = Math.max(2, Math.round(d * 0.07));
  const s = Math.round(d * 0.42);
  const c = Math.round(d * 0.85);
  return [
    { n: 1, range: `0–${h}s`, title: "Hook", desc: "Grab attention — the first frame decides everything" },
    { n: 2, range: `${h}–${s}s`, title: "Setup", desc: "Establish the problem or promise your audience cares about" },
    { n: 3, range: `${s}–${c}s`, title: "Core Value", desc: "Deliver the insight, proof, or entertainment — the payoff" },
    { n: 4, range: `${c}–${d}s`, title: "CTA", desc: "Give a clear next action: follow, save, comment, or click" },
  ];
}

// ─── Hook template with highlighted [Variable] spans ──────────────────────────

function HighlightedTemplate({ template, values }: { template: string; values: Record<string, string> }) {
  const parts: Array<{ text: string; isVar: boolean }> = [];
  let last = 0;
  for (const m of template.matchAll(/\[([^\]]+)\]/g)) {
    if (m.index! > last) parts.push({ text: template.slice(last, m.index), isVar: false });
    parts.push({ text: values[m[1]] || m[0], isVar: true });
    last = m.index! + m[0].length;
  }
  if (last < template.length) parts.push({ text: template.slice(last), isVar: false });

  return (
    <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.5 }}>
      {parts.map((p, i) =>
        p.isVar ? (
          <span key={i} style={{ background: "rgba(124,92,255,0.2)", color: "#a78bfa", borderRadius: 4, padding: "1px 5px" }}>
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const urlPatternId = new URLSearchParams(search).get("patternId");

  const [selected, setSelected] = useState<Pattern | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const { data: patternsRaw, isLoading } = useQuery({
    queryKey: ["/api/patterns/list", urlPatternId],
    queryFn: () => fetch(
      "/api/patterns/list" + (urlPatternId ? "?patternId=" + encodeURIComponent(urlPatternId) : ""),
      { credentials: "include" }
    ).then((r) => r.json()),
  });
  const patterns: Pattern[] = Array.isArray(patternsRaw) ? patternsRaw : [];

  // Pre-select from URL param once patterns load — skip step 1
  useEffect(() => {
    if (urlPatternId && patterns.length > 0 && !selected) {
      const pre = patterns.find((p) => p.id === urlPatternId || (p as any).pattern_id === urlPatternId);
      if (pre) { setSelected(pre); setVars({}); }
    }
  }, [urlPatternId, patterns, selected]);

  const variables = useMemo(() => extractVars(selected?.hook_template ?? null), [selected]);
  const hookFinal = useMemo(() => fillTemplate(selected?.hook_template ?? null, vars), [selected, vars]);
  const allVarsFilled = variables.length === 0 || variables.every((v) => (vars[v] || "").trim().length > 0);
  const timeline = useMemo(() => buildTimeline(selected?.optimal_duration ?? null), [selected]);
  const duration = formatDuration(selected?.optimal_duration ?? null);

  // Stepper: 0=no pattern, 1=pattern+vars pending, 2=vars filled
  const step = !selected ? 0 : !allVarsFilled ? 1 : 2;

  const handleSelect = (p: Pattern) => { setSelected(p); setVars({}); };
  const handleVarChange = (key: string, val: string) => setVars((prev) => ({ ...prev, [key]: val }));

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/workspace/save-brief", {
        hookFinal,
        patternId: selected?.id,
        duration,
      }),
    onSuccess: () => {
      setSavedOk(true);
      toast({ title: "Brief saved to workspace!" });
      setTimeout(() => setSavedOk(false), 2500);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const copyBrief = () => {
    if (!selected) return;
    const steps = timeline.map((t) => `${t.n}. ${t.title} (${t.range})`).join("\n   ");
    const text = [
      `HOOK: "${hookFinal || selected.hook_template}"`,
      `DURATION: ${duration}`,
      `STRUCTURE:\n   ${steps}`,
      selected.why_it_works ? `WHY IT WORKS: ${selected.why_it_works}` : null,
      selected.cta_suggestion ? `CTA: ${selected.cta_suggestion}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const niche =
    selected?.topic_cluster?.replace(/_/g, " ") ||
    patterns[0]?.topic_cluster?.replace(/_/g, " ") ||
    "your niche";

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)", background: "#0a0a0f", overflow: "hidden", borderRadius: 12 }}>

        {/* ── TOP BAR ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 56, flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,10,15,0.98)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => navigate("/home")}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: 0 }}
            >
              <ChevronLeft size={15} /> Back
            </button>
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>CRAFLECT</span>
            <span style={{
              background: "rgba(124,92,255,0.2)", border: "1px solid rgba(124,92,255,0.45)",
              color: "#a78bfa", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
            }}>
              STUDIO
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginLeft: 2 }}>
              Turn viral patterns into your filming brief
            </span>
          </div>

          {/* Stepper pills */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[
              { label: "Pattern", done: step >= 1 },
              { label: "Hook", done: step >= 2 },
              { label: "Brief", done: false },
            ].map((pill, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 14px", borderRadius: 20,
                  background: pill.done
                    ? "rgba(124,92,255,0.18)"
                    : i === step
                    ? "rgba(255,255,255,0.07)"
                    : "transparent",
                  border: pill.done
                    ? "1px solid rgba(124,92,255,0.45)"
                    : i === step
                    ? "1px solid rgba(255,255,255,0.14)"
                    : "1px solid transparent",
                  fontSize: 12, fontWeight: 600,
                  color: pill.done ? "#a78bfa" : i === step ? "#fff" : "rgba(255,255,255,0.22)",
                  transition: "all 0.2s",
                }}
              >
                {pill.done && <span style={{ fontSize: 10 }}>✓</span>}
                {pill.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── SPLIT SCREEN ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* LEFT PANEL — Pattern list */}
          <div style={{
            width: 320, flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            overflowY: "auto", padding: "16px 12px",
            background: "rgba(8,8,16,0.8)",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.22)",
              letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, paddingLeft: 4,
            }}>
              Your patterns — {niche}
            </div>

            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 90, background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 8 }} />
              ))
            ) : patterns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 16px", color: "rgba(255,255,255,0.22)", fontSize: 13 }}>
                No patterns available yet
              </div>
            ) : (
              patterns.map((p) => {
                const isSel = selected?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    style={{
                      borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                      border: isSel ? "1px solid #7C5CFF" : "1px solid rgba(255,255,255,0.05)",
                      background: isSel ? "rgba(124,92,255,0.1)" : "rgba(255,255,255,0.02)",
                      transition: "all 0.15s",
                    }}
                  >
                    {p.trend_status && (
                      <div style={{ marginBottom: 6 }}>
                        {p.trend_status === "emerging" && (
                          <span style={{ background: "rgba(239,68,68,0.13)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                            🔥 Emerging
                          </span>
                        )}
                        {p.trend_status === "trending" && (
                          <span style={{ background: "rgba(124,92,255,0.13)", border: "1px solid rgba(124,92,255,0.35)", color: "#a78bfa", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                            ⚡ Trending
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: 13, fontWeight: 600, color: isSel ? "#c4b5fd" : "#a78bfa", marginBottom: 6, lineHeight: 1.3 }}>
                      {p.pattern_label || "Pattern"}
                    </div>

                    {p.hook_template && (
                      <div style={{
                        fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.45)",
                        background: "rgba(0,0,0,0.28)", borderRadius: 6, padding: "6px 8px",
                        lineHeight: 1.5, marginBottom: 8,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}>
                        {p.hook_template}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                        Score {Math.round(p.avg_virality_score || 0)}
                      </span>
                      {p.optimal_duration && (
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{p.optimal_duration}s</span>
                      )}
                      {p.velocity_7d && (
                        <span style={{ fontSize: 10, color: "#10b981" }}>+{Math.round(p.velocity_7d)}/w</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT PANEL */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 48px" }}>
            {!selected ? (
              /* Empty state */
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                height: "100%", gap: 16, color: "rgba(255,255,255,0.28)",
              }}>
                <div style={{
                  width: 64, height: 64, background: "rgba(124,92,255,0.08)", borderRadius: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid rgba(124,92,255,0.2)",
                }}>
                  <Sparkles size={26} color="rgba(124,92,255,0.5)" />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
                    Select a pattern to start
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Pick a viral pattern from the left panel to build your filming brief
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 18 }}>

                {/* ── ZONE 1: Hook Hero ── */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(124,92,255,0.09), rgba(192,38,211,0.04))",
                  border: "1px solid rgba(124,92,255,0.2)",
                  borderRadius: 16, padding: "22px 24px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", background: "#7C5CFF",
                      boxShadow: "0 0 10px rgba(124,92,255,0.8)",
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.2 }}>
                      Viral hook template — customize it
                    </span>
                  </div>

                  {/* Highlighted template */}
                  <div style={{ marginBottom: 20, lineHeight: 1.55 }}>
                    <HighlightedTemplate template={selected.hook_template || ""} values={vars} />
                  </div>

                  {/* Variable inputs */}
                  {variables.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: variables.length === 1 ? "1fr" : "1fr 1fr", gap: 10 }}>
                      {variables.map((v) => (
                        <div key={v}>
                          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", display: "block", marginBottom: 5 }}>
                            [{v}]
                          </label>
                          <input
                            value={vars[v] || ""}
                            onChange={(e) => handleVarChange(v, e.target.value)}
                            placeholder={`Your ${v.toLowerCase()}…`}
                            style={{
                              width: "100%", background: "rgba(0,0,0,0.45)",
                              border: vars[v] ? "1px solid rgba(124,92,255,0.5)" : "1px solid rgba(124,92,255,0.2)",
                              borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13,
                              outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>
                      This template is ready to use as-is — no customization needed
                    </div>
                  )}
                </div>

                {/* ── ZONE 2: Live Preview ── */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.07), rgba(5,150,105,0.03))",
                  border: "1px solid rgba(16,185,129,0.16)",
                  borderRadius: 16, padding: "16px 20px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>✨</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(16,185,129,0.65)", textTransform: "uppercase", letterSpacing: 1.1 }}>
                      Your hook — live preview
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.55 }}>
                    "{hookFinal || selected.hook_template}"
                  </div>
                </div>

                {/* ── ZONE 3: Structure Timeline ── */}
                <div style={{
                  background: "rgba(255,255,255,0.018)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: "18px 20px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 }}>
                    Structure
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {timeline.map((t) => (
                      <div key={t.n} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          background: "rgba(124,92,255,0.18)", border: "1px solid rgba(124,92,255,0.38)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "#a78bfa",
                        }}>
                          {t.n}
                        </div>
                        <div style={{ flex: 1, paddingTop: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{t.title}</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>{t.range}</span>
                          </div>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>{t.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── ZONE 4: Final Brief ── */}
                <div style={{
                  background: "rgba(10,10,22,0.7)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 16, padding: "22px 24px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>📋 Your filming brief</span>
                    <span style={{
                      background: "rgba(251,146,60,0.14)", border: "1px solid rgba(251,146,60,0.28)",
                      color: "#fb923c", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                    }}>
                      {duration}
                    </span>
                  </div>

                  {/* Hook with left border */}
                  <div style={{ borderLeft: "3px solid #7C5CFF", paddingLeft: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.28)", letterSpacing: 1, marginBottom: 5 }}>HOOK</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.55 }}>
                      "{hookFinal || selected.hook_template}"
                    </div>
                  </div>

                  {/* Why it works */}
                  {selected.why_it_works && (
                    <div style={{
                      background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
                      borderRadius: 10, padding: "12px 14px", marginBottom: 10,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#10b981", marginBottom: 5 }}>💡 Why this works</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{selected.why_it_works}</div>
                    </div>
                  )}

                  {/* Suggested CTA */}
                  {selected.cta_suggestion && (
                    <div style={{
                      background: "rgba(124,92,255,0.06)", border: "1px solid rgba(124,92,255,0.16)",
                      borderRadius: 10, padding: "12px 14px", marginBottom: 18,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", marginBottom: 5 }}>🎯 Suggested CTA</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{selected.cta_suggestion}</div>
                    </div>
                  )}

                  {!selected.why_it_works && !selected.cta_suggestion && (
                    <div style={{ height: 10 }} />
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
                    <button
                      onClick={() => { setSelected(null); setVars({}); }}
                      style={{
                        background: "none", border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.38)", borderRadius: 10, padding: "10px 16px",
                        fontSize: 13, cursor: "pointer",
                      }}
                    >
                      Start over
                    </button>

                    <button
                      onClick={copyBrief}
                      style={{
                        background: copied ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.05)",
                        border: copied ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.12)",
                        color: copied ? "#10b981" : "rgba(255,255,255,0.65)",
                        borderRadius: 10, padding: "10px 16px", fontSize: 13, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                      }}
                    >
                      {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy brief</>}
                    </button>

                    <button
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      style={{
                        background: savedOk ? "rgba(16,185,129,0.18)" : "linear-gradient(90deg, #7C5CFF, #c026d3)",
                        border: "none", color: "#fff", borderRadius: 10, padding: "10px 20px",
                        fontSize: 13, fontWeight: 600, cursor: saveMutation.isPending ? "wait" : "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                        opacity: saveMutation.isPending ? 0.7 : 1, transition: "all 0.2s",
                      }}
                    >
                      {savedOk ? "✓ Saved!" : "Save to workspace →"}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
