import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Check, Loader2, TrendingUp, RefreshCw, LogOut, Link, SkipForward } from "lucide-react";

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

const PLATFORMS = [
  { value: "tiktok", label: "TikTok", color: "#69C9D0", placeholder: "https://www.tiktok.com/@yourhandle" },
  { value: "instagram", label: "Instagram", color: "#E1306C", placeholder: "https://www.instagram.com/yourhandle" },
  { value: "youtube", label: "YouTube", color: "#FF0000", placeholder: "https://www.youtube.com/@yourchannel" },
];

const slideVariants = {
  enter: { opacity: 0, x: 50 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

function NicheSearchInput({ placeholder, exclude, selected, onSelect, max = 1 }: {
  placeholder: string; exclude: string[]; selected: string[]; onSelect: (value: string) => void; max?: number;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query ? ALL_NICHES.filter(n =>
    !exclude.includes(n.value) && !selected.includes(n.value) &&
    n.label.toLowerCase().includes(query.toLowerCase())
  ) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{ width: "100%", padding: "14px 18px 14px 44px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 17, boxSizing: "border-box" as const, outline: "none" }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, maxHeight: 220, overflowY: "auto" as const, zIndex: 50 }}>
          {filtered.map(n => (
            <div key={n.value}
              onClick={() => { if (selected.length < max) { onSelect(n.value); setQuery(""); setOpen(false); } }}
              style={{ padding: "12px 18px", cursor: selected.length >= max ? "not-allowed" : "pointer", fontSize: 17, color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,92,255,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
            >{n.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Steps: 0=Welcome, 1=ConnectProfile, 2=PrimaryNiche, 3=SecondaryNiches, 4=ContentStyle, 5=Platforms, 6=BuildingFeed, 7=Ready
const TOTAL_STEPS = 8;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // Profile import state (T15)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [profileImported, setProfileImported] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Niche state
  const [primaryNiche, setPrimaryNiche] = useState<string | null>(null);
  const [secondaryNiches, setSecondaryNiches] = useState<string[]>([]);
  const [contentStyle, setContentStyle] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok']);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if ((user as any)?.isAdmin) setLocation("/system/founder");
  }, [user, setLocation]);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const toggleSecondary = (value: string) => {
    setSecondaryNiches(prev => {
      if (prev.includes(value)) return prev.filter(n => n !== value);
      if (prev.length >= 2) return prev;
      return [...prev, value];
    });
  };

  const handleLogout = async () => {
    try { await fetch("/api/logout"); } catch {}
    window.location.href = "/";
  };

  const handleProfileImport = async () => {
    if (!selectedPlatform || !profileUrl.trim()) return;
    setIsImporting(true);
    setImportError(null);
    try {
      await apiRequest("POST", "/api/user/import-profile", {
        platform: selectedPlatform,
        profileUrl: profileUrl.trim(),
      });
      setProfileImported(true);
      setTimeout(() => setStep(2), 800);
    } catch (err: any) {
      setImportError(err?.message || "Import failed. You can skip this step.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSkipProfile = () => {
    setStep(2);
  };

  const savePreferences = async () => {
    await apiRequest("PATCH", "/api/user/preferences", {
      selectedNiches: [primaryNiche!, ...secondaryNiches],
      primaryNiche: primaryNiche!,
      secondaryNiches,
      contentStyle: contentStyle || "educational",
      userGoal: "content_creator",
      onboardingCompleted: true,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : ['tiktok'],
    });
  };

  const handleSubmit = async () => {
    if (!primaryNiche) return;
    setIsSubmitting(true);
    setStep(6);
    try {
      await savePreferences();
    } catch {
      try { await savePreferences(); } catch {}
    }
    setIsSubmitting(false);
    [600, 1200, 1900, 2600].forEach((d, i) => setTimeout(() => setAnalysisStep(i), d));
    setTimeout(() => setStep(7), 3800);
  };

  const togglePlatform = (value: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(value)
        ? prev.length > 1 ? prev.filter(p => p !== value) : prev // keep at least 1
        : [...prev, value]
    );
  };

  const handleEnterDashboard = async () => {
    // Final safety: ensure onboardingCompleted=true is saved before hard navigation
    try {
      await apiRequest("PATCH", "/api/user/preferences", { onboardingCompleted: true });
    } catch {}
    const seenKey = `proof_seen_${(user as any)?.id || 'anon'}`;
    if (!localStorage.getItem(seenKey)) {
      localStorage.setItem(seenKey, '1');
      window.location.href = "/proof";
    } else {
      window.location.href = "/home";
    }
  };

  const suggestedNiches = ALL_NICHES.slice(0, 10);
  const secondarySuggestions = ALL_NICHES.filter(n => n.value !== primaryNiche).slice(0, 12);
  const activePlatform = PLATFORMS.find(p => p.value === selectedPlatform);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" as const, overflow: "hidden", position: "relative" as const }}>
      <div style={{ position: "absolute" as const, top: 0, left: "50%", transform: "translateX(-50%)", width: 900, height: 500, background: "rgba(124,92,255,0.06)", borderRadius: "50%", filter: "blur(160px)", pointerEvents: "none" as const }} />

      <div style={{ width: "100%", height: 3, background: "#1a1a2e" }}>
        <motion.div style={{ height: "100%", background: "linear-gradient(90deg,#7C5CFF,#c026d3)" }}
          initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
      </div>

      {step < 6 && (
        <div style={{ position: "absolute" as const, top: 16, right: 20, zIndex: 20 }}>
          <button onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 16px", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer" }}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px" }}>
        <div style={{ width: "100%", maxWidth: 540, position: "relative" as const, zIndex: 10 }}>
          <AnimatePresence mode="wait">

            {/* STEP 0 — Welcome */}
            {step === 0 && (
              <motion.div key="s0" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} style={{ textAlign: "center" as const }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                  style={{ width: 88, height: 88, background: "rgba(124,92,255,0.12)", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 36px" }}>
                  <TrendingUp size={44} color="#7C5CFF" />
                </motion.div>
                <h1 style={{ fontSize: 48, fontWeight: 700, margin: "0 0 20px", lineHeight: 1.15 }}>
                  The intelligence layer that top creators don't talk about.
                </h1>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, margin: "0 0 16px", lineHeight: 1.7, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
                  Answer 4 questions. Get a personalized feed of viral patterns matched to your niche.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 36, margin: "0 0 44px" }}>
                  {[["83", "patterns detected"], ["5", "niches analyzed"], ["Daily", "updated"]].map(([val, label]) => (
                    <div key={label} style={{ textAlign: "center" as const }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#7C5CFF" }}>{val}</div>
                      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.35)" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setStep(1)} style={{ height: 60, padding: "0 48px", background: "linear-gradient(90deg,#7C5CFF,#c026d3)", border: "none", borderRadius: 14, fontSize: 19, fontWeight: 600, cursor: "pointer", color: "#fff" }}>
                  Get started →
                </Button>
              </motion.div>
            )}

            {/* STEP 1 — Connect Profile */}
            {step === 1 && (
              <motion.div key="s1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, background: "rgba(124,92,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Link size={20} color="#7C5CFF" />
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Optional · 30 seconds</div>
                </div>
                <h2 style={{ fontSize: 36, fontWeight: 700, margin: "0 0 10px" }}>Connect your profile</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, margin: "0 0 28px", lineHeight: 1.6 }}>
                  Craflect will analyze your existing content to personalize your feed even further.
                </p>

                {/* Platform selector */}
                <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                  {PLATFORMS.map(p => (
                    <button key={p.value} onClick={() => { setSelectedPlatform(p.value); setProfileUrl(""); setImportError(null); }}
                      style={{ flex: 1, padding: "14px 10px", borderRadius: 12, border: selectedPlatform === p.value ? `1px solid ${p.color}` : "1px solid rgba(255,255,255,0.12)", background: selectedPlatform === p.value ? `${p.color}18` : "rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "center" as const, transition: "all 0.2s" }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: selectedPlatform === p.value ? p.color : "rgba(255,255,255,0.6)" }}>{p.label}</div>
                    </button>
                  ))}
                </div>

                {/* URL input */}
                {selectedPlatform && !profileImported && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <input
                      type="url"
                      value={profileUrl}
                      onChange={e => { setProfileUrl(e.target.value); setImportError(null); }}
                      placeholder={activePlatform?.placeholder || ""}
                      style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: importError ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, boxSizing: "border-box" as const, outline: "none", marginBottom: 12 }}
                    />
                    {importError && <p style={{ color: "#ef4444", fontSize: 14, margin: "0 0 12px" }}>{importError}</p>}
                    <Button
                      onClick={handleProfileImport}
                      disabled={!profileUrl.trim() || isImporting}
                      style={{ width: "100%", background: "linear-gradient(90deg,#7C5CFF,#c026d3)", color: "#fff", border: "none", padding: "15px 0", borderRadius: 12, fontSize: 17, fontWeight: 600, cursor: profileUrl.trim() && !isImporting ? "pointer" : "not-allowed", opacity: profileUrl.trim() && !isImporting ? 1 : 0.5, marginBottom: 12 }}>
                      {isImporting ? <><Loader2 size={17} className="animate-spin" style={{ marginRight: 8, display: "inline" }} />Importing...</> : "Import my profile →"}
                    </Button>
                  </motion.div>
                )}

                {/* Success state */}
                {profileImported && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, marginBottom: 16 }}>
                    <Check size={20} color="#10b981" />
                    <span style={{ fontSize: 16, color: "#10b981", fontWeight: 600 }}>Profile imported — personalizing your feed</span>
                  </motion.div>
                )}

                {/* Benefit hint */}
                {!profileImported && (
                  <div style={{ background: "rgba(124,92,255,0.06)", border: "1px solid rgba(124,92,255,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
                    <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                      ✨ <strong style={{ color: "rgba(255,255,255,0.6)" }}>Why connect?</strong> We analyze your top videos to detect your hook style, format, and audience — then filter opportunities that match YOUR proven patterns.
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep(0)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 17, cursor: "pointer" }}>← Back</button>
                  <button onClick={handleSkipProfile}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 16, cursor: "pointer" }}>
                    <SkipForward size={15} />
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Primary Niche */}
            {step === 2 && (
              <motion.div key="s2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                <h2 style={{ fontSize: 36, fontWeight: 700, margin: "0 0 10px" }}>What's your primary niche?</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, margin: "0 0 28px" }}>Your main content topic. Choose one.</p>
                <div style={{ marginBottom: 20 }}>
                  <NicheSearchInput placeholder="Search niches..." exclude={[]} selected={primaryNiche ? [primaryNiche] : []} onSelect={v => setPrimaryNiche(v)} max={1} />
                </div>
                {primaryNiche && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "rgba(124,92,255,0.15)", border: "1px solid #7C5CFF", borderRadius: 12, marginBottom: 20 }}>
                    <Check size={18} color="#7C5CFF" />
                    <span style={{ fontSize: 17, fontWeight: 600, flex: 1 }}>{ALL_NICHES.find(n => n.value === primaryNiche)?.label}</span>
                    <button onClick={() => setPrimaryNiche(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 22 }}>×</button>
                  </div>
                )}
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", margin: "0 0 14px", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Popular niches</p>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12, marginBottom: 32 }}>
                  {suggestedNiches.map(n => (
                    <button key={n.value} onClick={() => setPrimaryNiche(n.value === primaryNiche ? null : n.value)}
                      style={{ padding: "11px 20px", borderRadius: 28, fontSize: 16, cursor: "pointer", border: primaryNiche === n.value ? "1px solid #7C5CFF" : "1px solid rgba(255,255,255,0.15)", background: primaryNiche === n.value ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.05)", color: primaryNiche === n.value ? "#fff" : "rgba(255,255,255,0.6)" }}>
                      {primaryNiche === n.value && "✓ "}{n.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 17, cursor: "pointer" }}>← Back</button>
                  <Button onClick={() => setStep(3)} disabled={!primaryNiche}
                    style={{ background: "#7C5CFF", color: "#fff", border: "none", padding: "14px 32px", borderRadius: 12, fontSize: 18, fontWeight: 600, cursor: primaryNiche ? "pointer" : "not-allowed", opacity: primaryNiche ? 1 : 0.4 }}>
                    Continue →
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Secondary Niches */}
            {step === 3 && (
              <motion.div key="s3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                <h2 style={{ fontSize: 36, fontWeight: 700, margin: "0 0 10px" }}>Any secondary topics?</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, margin: "0 0 6px" }}>Topics you also cover — up to 2. <span style={{ color: "#7C5CFF", fontSize: 16 }}>Optional</span></p>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 16, margin: "0 0 24px" }}>Cross-niche patterns are often the most viral.</p>
                <div style={{ marginBottom: 20 }}>
                  <NicheSearchInput placeholder="Search secondary topics..." exclude={primaryNiche ? [primaryNiche] : []} selected={secondaryNiches} onSelect={toggleSecondary} max={2} />
                </div>
                {secondaryNiches.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, marginBottom: 20 }}>
                    {secondaryNiches.map(v => (
                      <div key={v} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(124,92,255,0.15)", border: "1px solid #7C5CFF", borderRadius: 28, fontSize: 16, fontWeight: 600 }}>
                        {ALL_NICHES.find(n => n.value === v)?.label}
                        <button onClick={() => toggleSecondary(v)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {secondaryNiches.length === 0 && <p style={{ fontSize: 16, color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>None selected — you can skip this step</p>}
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", margin: "0 0 14px", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Suggestions</p>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12, marginBottom: 32 }}>
                  {secondarySuggestions.slice(0, 9).map(n => {
                    const sel = secondaryNiches.includes(n.value);
                    const disabled = !sel && secondaryNiches.length >= 2;
                    return (
                      <button key={n.value} onClick={() => !disabled && toggleSecondary(n.value)}
                        style={{ padding: "11px 20px", borderRadius: 28, fontSize: 16, cursor: disabled ? "not-allowed" : "pointer", border: sel ? "1px solid #7C5CFF" : "1px solid rgba(255,255,255,0.15)", background: sel ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.05)", color: sel ? "#fff" : disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", opacity: disabled ? 0.5 : 1 }}>
                        {sel && "✓ "}{n.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep(2)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 17, cursor: "pointer" }}>← Back</button>
                  <Button onClick={() => setStep(4)} style={{ background: "#7C5CFF", color: "#fff", border: "none", padding: "14px 32px", borderRadius: 12, fontSize: 18, fontWeight: 600, cursor: "pointer" }}>Continue →</Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4 — Content Style */}
            {step === 4 && (
              <motion.div key="s4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                <h2 style={{ fontSize: 36, fontWeight: 700, margin: "0 0 10px" }}>Your content style</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, margin: "0 0 28px" }}>Helps us weight the most relevant patterns for your audience.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
                  {CONTENT_STYLES.map(s => (
                    <button key={s.value} onClick={() => setContentStyle(s.value)}
                      style={{ padding: "24px 20px", borderRadius: 14, textAlign: "left" as const, cursor: "pointer", border: contentStyle === s.value ? "1px solid #7C5CFF" : "1px solid rgba(255,255,255,0.1)", background: contentStyle === s.value ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>{s.emoji}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: "#fff" }}>{s.label}</div>
                      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep(3)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 17, cursor: "pointer" }}>← Back</button>
                  <Button onClick={() => setStep(5)} disabled={!contentStyle}
                    style={{ background: "linear-gradient(90deg,#7C5CFF,#c026d3)", color: "#fff", border: "none", padding: "14px 32px", borderRadius: 12, fontSize: 18, fontWeight: 600, cursor: contentStyle ? "pointer" : "not-allowed", opacity: contentStyle ? 1 : 0.4 }}>
                    Continue →
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 5 — Platform Selection */}
            {step === 5 && (
              <motion.div key="s5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
                <h2 style={{ fontSize: 36, fontWeight: 700, margin: "0 0 12px" }}>Where do you post?</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, margin: "0 0 32px" }}>Select all platforms you create content for</p>

                <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, marginBottom: 36 }}>
                  {[
                    { value: 'tiktok', label: 'TikTok', sub: 'Short-form vertical video', color: '#fff' },
                    { value: 'instagram', label: 'Instagram Reels', sub: 'Reels & Stories', color: '#E1306C' },
                    { value: 'youtube', label: 'YouTube Shorts', sub: 'Short-form on YouTube', color: '#FF0000' },
                  ].map(p => {
                    const active = selectedPlatforms.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        onClick={() => togglePlatform(p.value)}
                        style={{
                          display: "flex", alignItems: "center", gap: 16, padding: "18px 20px",
                          borderRadius: 14, textAlign: "left" as const, cursor: "pointer",
                          border: active ? `1px solid ${p.color}50` : "1px solid rgba(255,255,255,0.1)",
                          background: active ? `rgba(${p.value === 'tiktok' ? '255,255,255' : p.value === 'instagram' ? '225,48,108' : '255,0,0'},0.06)` : "rgba(255,255,255,0.04)",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: active ? `${p.color}20` : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {p.value === 'tiktok' && (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill={active ? '#fff' : 'rgba(255,255,255,0.4)'}>
                              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.37a8.16 8.16 0 004.77 1.52V7.45a4.85 4.85 0 01-1-.76z"/>
                            </svg>
                          )}
                          {p.value === 'instagram' && (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill={active ? '#E1306C' : 'rgba(255,255,255,0.4)'}>
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                            </svg>
                          )}
                          {p.value === 'youtube' && (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill={active ? '#FF0000' : 'rgba(255,255,255,0.4)'}>
                              <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: 2 }}>{p.label}</div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>{p.sub}</div>
                        </div>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          border: active ? 'none' : '1px solid rgba(255,255,255,0.2)',
                          background: active ? '#7C5CFF' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {active && <Check size={13} color="#fff" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep(4)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 17, cursor: "pointer" }}>← Back</button>
                  <Button onClick={handleSubmit} disabled={selectedPlatforms.length === 0 || isSubmitting}
                    style={{ background: "linear-gradient(90deg,#7C5CFF,#c026d3)", color: "#fff", border: "none", padding: "14px 32px", borderRadius: 12, fontSize: 18, fontWeight: 600, cursor: "pointer" }}>
                    {isSubmitting && <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} />}
                    Build my feed →
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 6 — Building Feed */}
            {step === 6 && (
              <motion.div key="s5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} style={{ textAlign: "center" as const }}>
                <div style={{ width: 80, height: 80, background: "rgba(124,92,255,0.12)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
                  <RefreshCw size={36} color="#7C5CFF" className="animate-spin" />
                </div>
                <h2 style={{ fontSize: 36, fontWeight: 700, margin: "0 0 12px" }}>Building your intelligence feed...</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, margin: "0 0 36px" }}>Analyzing viral patterns matched to your profile</p>
                <div style={{ textAlign: "left" as const }}>
                  {ANALYSIS_STEPS.map((label, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0.2 }} animate={{ opacity: analysisStep >= idx ? 1 : 0.2 }} transition={{ duration: 0.4 }}
                      style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: idx < ANALYSIS_STEPS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {analysisStep >= idx ? <Check size={14} color="#10b981" /> : <Loader2 size={14} color="rgba(255,255,255,0.3)" className="animate-spin" />}
                      </div>
                      <span style={{ fontSize: 17, color: "rgba(255,255,255,0.7)" }}>{label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 7 — Ready */}
            {step === 7 && (
              <motion.div key="s6" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }} style={{ textAlign: "center" as const }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
                  style={{ width: 80, height: 80, background: "rgba(16,185,129,0.12)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
                  <Check size={40} color="#10b981" />
                </motion.div>
                <h2 style={{ fontSize: 36, fontWeight: 700, margin: "0 0 12px" }}>Your feed is ready</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, margin: "0 0 32px" }}>Here's your intelligence profile</p>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, marginBottom: 32, textAlign: "left" as const }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Primary niche</span>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "#7C5CFF" }}>{ALL_NICHES.find(n => n.value === primaryNiche)?.label}</span>
                  </div>
                  {secondaryNiches.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Secondary topics</span>
                      <span style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{secondaryNiches.map(v => ALL_NICHES.find(n => n.value === v)?.label).join(", ")}</span>
                    </div>
                  )}
                  {profileImported && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Profile</span>
                      <span style={{ fontSize: 17, fontWeight: 600, color: "#10b981" }}>✓ {PLATFORMS.find(p => p.value === selectedPlatform)?.label} connected</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Content style</span>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{CONTENT_STYLES.find(s => s.value === contentStyle)?.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Status</span>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "#10b981" }}>✓ Feed personalized</span>
                  </div>
                </div>
                <Button onClick={handleEnterDashboard}
                  style={{ width: "100%", background: "linear-gradient(90deg,#7C5CFF,#c026d3)", color: "#fff", border: "none", padding: "18px 0", borderRadius: 14, fontSize: 19, fontWeight: 600, cursor: "pointer" }}>
                  Enter my intelligence feed →
                </Button>
                <button onClick={() => setStep(2)} style={{ marginTop: 16, background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 16, cursor: "pointer" }}>
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
