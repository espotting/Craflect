import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Check, Loader2, TrendingUp, RefreshCw } from "lucide-react";

const ALL_NICHES = [
  { value: "ai_tools", label: "AI Tools" },
  { value: "finance", label: "Finance" },
  { value: "productivity", label: "Productivity" },
  { value: "online_business", label: "Online Business" },
  { value: "content_creation", label: "Content Creation" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "digital_marketing", label: "Digital Marketing" },
  { value: "ecommerce", label: "Ecommerce" },
  { value: "saas", label: "SaaS" },
  { value: "real_estate", label: "Real Estate" },
  { value: "crypto", label: "Crypto" },
  { value: "fitness", label: "Fitness" },
  { value: "mindset", label: "Mindset" },
  { value: "health", label: "Health" },
  { value: "travel", label: "Travel" },
  { value: "cooking", label: "Cooking" },
  { value: "education", label: "Education" },
  { value: "personal_development", label: "Personal Development" },
  { value: "marketing", label: "Marketing" },
  { value: "gaming", label: "Gaming" },
];

const CONTENT_STYLES = [
  { value: "educational", label: "Educational", emoji: "📚", desc: "Teach and inform" },
  { value: "motivational", label: "Motivational", emoji: "🔥", desc: "Inspire and push" },
  { value: "entertainment", label: "Entertainment", emoji: "🎭", desc: "Engage and entertain" },
  { value: "storytelling", label: "Storytelling", emoji: "🎬", desc: "Narrative and depth" },
];

const ANALYSIS_STEPS = [
  "Filtering videos matching your niche profile",
  "Ranking top viral patterns by engagement",
  "Calibrating hook performance for your style",
  "Generating your personalized opportunity score",
];

const slideVariants = {
  enter: { opacity: 0, x: 50 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

function NicheSearchInput({
  placeholder,
  exclude,
  selected,
  onSelect,
  max = 1,
}: {
  placeholder: string;
  exclude: string[];
  selected: string[];
  onSelect: (value: string) => void;
  max?: number;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query
    ? ALL_NICHES.filter(
        (n) =>
          !exclude.includes(n.value) &&
          !selected.includes(n.value) &&
          n.label.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.35 }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" placeholder={placeholder} value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{
            width: "100%", padding: "13px 18px 13px 42px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)",
            color: "#fff", fontSize: 15, boxSizing: "border-box" as const, outline: "none",
          }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 12, maxHeight: 200, overflowY: "auto" as const, zIndex: 50,
        }}>
          {filtered.map((n) => (
            <div key={n.value}
              onClick={() => {
                if (selected.length < max) { onSelect(n.value); setQuery(""); setOpen(false); }
              }}
              style={{
                padding: "11px 16px", cursor: selected.length >= max ? "not-allowed" : "pointer",
                fontSize: 15, color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,92,255,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              {n.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [primaryNiche, setPrimaryNiche] = useState<string | null>(null);
  const [secondaryNiches, setSecondaryNiches] = useState<string[]>([]);
  const [contentStyle, setContentStyle] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if ((user as any)?.isAdmin) setLocation("/system/founder");
  }, [user, setLocation]);

  const TOTAL_STEPS = 5;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const toggleSecondary = (value: string) => {
    setSecondaryNiches((prev) => {
      if (prev.includes(value)) return prev.filter((n) => n !== value);
      if (prev.length >= 2) return prev;
      return [...prev, value];
    });
  };

  const handleSubmit = async () => {
    if (!primaryNiche) return;
    setIsSubmitting(true);
    setStep(4);
    const allNiches = [primaryNiche, ...secondaryNiches];
    try {
      await apiRequest("PATCH", "/api/user/preferences", {
        selectedNiches: allNiches,
        primaryNiche,
        secondaryNiches,
        contentStyle: contentStyle || "educational",
        userGoal: contentStyle || "educational",
        onboardingCompleted: true,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch {}
    setIsSubmitting(false);
    const delays = [600, 1200, 1900, 2600];
    delays.forEach((d, i) => setTimeout(() => setAnalysisStep(i), d));
    setTimeout(() => setStep(5), 3800);
  };

  const handleEnterDashboard = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    setLocation("/home");
  };

  const suggestedNiches = ALL_NICHES.slice(0, 10);
  const secondarySuggestions = ALL_NICHES.filter((n) => n.value !== primaryNiche).slice(0, 12);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f", color: "#fff",
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" as const,
      overflow: "hidden", position: "relative" as const,
    }}>
      <div style={{
        position: "absolute" as const, top: 0, left: "50%", transform: "translateX(-50%)",
        width: 900, height: 500, background: "rgba(124,92,255,0.06)",
        borderRadius: "50%", filter: "blur(160px)", pointerEvents: "none" as const,
      }} />

      <div style={{ width: "100%", height: 3, background: "#1a1a2e" }}>
        <motion.div
          style={{ height: "100%", background: "linear-gradient(90deg,#7C5CFF,#c026d3)" }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px" }}>
        <div style={{ width: "100%", maxWidth: 520, position: "relative" as const, zIndex: 10 }}>
          <AnimatePresence mode="wait">

            {step === 0 && (
              <motion.div key="s0" variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35 }} style={{ textAlign: "center" as const }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                  style={{ width: 80, height: 80, background: "rgba(124,92,255,0.12)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
                  <TrendingUp size={40} color="#7C5CFF" />
                </motion.div>
                <h1 style={{ fontSize: 34, fontWeight: 700, margin: "0 0 16px", lineHeight: 1.2 }}>
                  The intelligence layer that top creators don't talk about.
                </h1>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, margin: "0 0 14px", lineHeight: 1.7, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                  Answer 4 questions. Get a personalized feed of viral patterns matched to your niche.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 32, margin: "0 0 40px" }}>
                  <div style={{ textAlign: "center" as const }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#7C5CFF" }}>83</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>patterns detected</div>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                  <div style={{ textAlign: "center" as const }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#7C5CFF" }}>5</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>niches analyzed</div>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                  <div style={{ textAlign: "center" as const }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#7C5CFF" }}>Daily</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>updated</div>
                  </div>
                </div>
                <Button onClick={() => setStep(1)} style={{
                  height: 56, padding: "0 40px", background: "linear-gradient(90deg,#7C5CFF,#c026d3)",
                  border: "none", borderRadius: 14, fontSize: 17, fontWeight: 600, cursor: "pointer", color: "#fff",
                }}>
                  Get started →
                </Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>What's your primary niche?</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, margin: "0 0 24px" }}>Your main content topic. Choose one.</p>
                <div style={{ marginBottom: 18 }}>
                  <NicheSearchInput placeholder="Search niches..." exclude={[]} selected={primaryNiche ? [primaryNiche] : []} onSelect={(v) => setPrimaryNiche(v)} max={1} />
                </div>
                {primaryNiche && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(124,92,255,0.15)", border: "1px solid #7C5CFF", borderRadius: 12, marginBottom: 18 }}>
                    <Check size={16} color="#7C5CFF" />
                    <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
                      {ALL_NICHES.find((n) => n.value === primaryNiche)?.label}
                    </span>
                    <button onClick={() => setPrimaryNiche(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 20 }}>×</button>
                  </div>
                )}
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: "0 0 12px", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Popular niches</p>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, marginBottom: 28 }}>
                  {suggestedNiches.map((n) => (
                    <button key={n.value} onClick={() => setPrimaryNiche(n.value === primaryNiche ? null : n.value)}
                      style={{
                        padding: "9px 18px", borderRadius: 24, fontSize: 14, cursor: "pointer",
                        border: primaryNiche === n.value ? "1px solid #7C5CFF" : "1px solid rgba(255,255,255,0.15)",
                        background: primaryNiche === n.value ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.05)",
                        color: primaryNiche === n.value ? "#fff" : "rgba(255,255,255,0.6)",
                      }}>
                      {primaryNiche === n.value && "✓ "}{n.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button onClick={() => setStep(2)} disabled={!primaryNiche}
                    style={{ background: "#7C5CFF", color: "#fff", border: "none", padding: "13px 28px", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: primaryNiche ? "pointer" : "not-allowed", opacity: primaryNiche ? 1 : 0.4 }}>
                    Continue →
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>Any secondary topics?</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, margin: "0 0 6px" }}>
                  Topics you also cover — up to 2. <span style={{ color: "#7C5CFF", fontSize: 14 }}>Optional</span>
                </p>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 14, margin: "0 0 22px" }}>Cross-niche patterns are often the most viral.</p>
                <div style={{ marginBottom: 18 }}>
                  <NicheSearchInput placeholder="Search secondary topics..." exclude={primaryNiche ? [primaryNiche] : []} selected={secondaryNiches} onSelect={toggleSecondary} max={2} />
                </div>
                {secondaryNiches.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 18 }}>
                    {secondaryNiches.map((v) => (
                      <div key={v} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(124,92,255,0.15)", border: "1px solid #7C5CFF", borderRadius: 24, fontSize: 14, fontWeight: 600 }}>
                        {ALL_NICHES.find((n) => n.value === v)?.label}
                        <button onClick={() => toggleSecondary(v)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {secondaryNiches.length === 0 && (
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", marginBottom: 18 }}>None selected — you can skip this step</p>
                )}
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: "0 0 12px", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Suggestions</p>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, marginBottom: 28 }}>
                  {secondarySuggestions.slice(0, 9).map((n) => {
                    const sel = secondaryNiches.includes(n.value);
                    const disabled = !sel && secondaryNiches.length >= 2;
                    return (
                      <button key={n.value} onClick={() => !disabled && toggleSecondary(n.value)}
                        style={{
                          padding: "9px 18px", borderRadius: 24, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
                          border: sel ? "1px solid #7C5CFF" : "1px solid rgba(255,255,255,0.15)",
                          background: sel ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.05)",
                          color: sel ? "#fff" : disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
                          opacity: disabled ? 0.5 : 1,
                        }}>
                        {sel && "✓ "}{n.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer" }}>← Back</button>
                  <Button onClick={() => setStep(3)} style={{ background: "#7C5CFF", color: "#fff", border: "none", padding: "13px 28px", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                    Continue →
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>Your content style</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, margin: "0 0 24px" }}>Helps us weight the most relevant patterns for your audience.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
                  {CONTENT_STYLES.map((s) => (
                    <button key={s.value} onClick={() => setContentStyle(s.value)}
                      style={{
                        padding: "20px 16px", borderRadius: 14, textAlign: "left" as const, cursor: "pointer",
                        border: contentStyle === s.value ? "1px solid #7C5CFF" : "1px solid rgba(255,255,255,0.1)",
                        background: contentStyle === s.value ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.05)",
                      }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>{s.emoji}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "#fff" }}>{s.label}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep(2)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer" }}>← Back</button>
                  <Button onClick={handleSubmit} disabled={!contentStyle || isSubmitting}
                    style={{ background: "linear-gradient(90deg,#7C5CFF,#c026d3)", color: "#fff", border: "none", padding: "13px 28px", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: contentStyle ? "pointer" : "not-allowed", opacity: contentStyle ? 1 : 0.4 }}>
                    {isSubmitting && <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />}
                    Build my feed →
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35 }} style={{ textAlign: "center" as const }}>
                <div style={{ width: 72, height: 72, background: "rgba(124,92,255,0.12)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
                  <RefreshCw size={32} color="#7C5CFF" className="animate-spin" />
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 10px" }}>Building your intelligence feed...</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, margin: "0 0 32px" }}>Analyzing viral patterns matched to your profile</p>
                <div style={{ textAlign: "left" as const }}>
                  {ANALYSIS_STEPS.map((label, idx) => (
                    <motion.div key={idx}
                      initial={{ opacity: 0.2 }} animate={{ opacity: analysisStep >= idx ? 1 : 0.2 }} transition={{ duration: 0.4 }}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: idx < ANALYSIS_STEPS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {analysisStep >= idx
                          ? <Check size={12} color="#10b981" />
                          : <Loader2 size={12} color="rgba(255,255,255,0.3)" className="animate-spin" />}
                      </div>
                      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.7)" }}>{label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="s5" variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35 }} style={{ textAlign: "center" as const }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
                  style={{ width: 72, height: 72, background: "rgba(16,185,129,0.12)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                  <Check size={36} color="#10b981" />
                </motion.div>
                <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 10px" }}>Your feed is ready</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, margin: "0 0 28px" }}>Here's your intelligence profile</p>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 20, marginBottom: 28, textAlign: "left" as const }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Primary niche</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#7C5CFF" }}>{ALL_NICHES.find((n) => n.value === primaryNiche)?.label}</span>
                  </div>
                  {secondaryNiches.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Secondary topics</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                        {secondaryNiches.map((v) => ALL_NICHES.find((n) => n.value === v)?.label).join(", ")}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Content style</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                      {CONTENT_STYLES.find((s) => s.value === contentStyle)?.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Status</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#10b981" }}>✓ Feed personalized</span>
                  </div>
                </div>
                <Button onClick={handleEnterDashboard}
                  style={{ width: "100%", background: "linear-gradient(90deg,#7C5CFF,#c026d3)", color: "#fff", border: "none", padding: "16px 0", borderRadius: 14, fontSize: 17, fontWeight: 600, cursor: "pointer" }}>
                  Enter my intelligence feed →
                </Button>
                <button onClick={() => setStep(1)} style={{ marginTop: 14, background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>
                  Edit my profile
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
