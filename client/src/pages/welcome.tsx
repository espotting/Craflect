import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  Megaphone,
  Briefcase,
  Compass,
  Check,
  Loader2,
  Play,
  Eye,
  Flame,
  LogOut,
} from "lucide-react";
import { getPredictedViews, getViralityColor } from "@/lib/predicted-views";

const NICHES = [
  { value: "ai_tools", label: "AI tools" },
  { value: "ai_automation", label: "AI automation" },
  { value: "online_business", label: "Online business" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "digital_marketing", label: "Digital marketing" },
  { value: "ecommerce", label: "Ecommerce" },
  { value: "saas", label: "SaaS" },
  { value: "real_estate", label: "Real estate" },
  { value: "finance", label: "Finance" },
  { value: "crypto", label: "Crypto" },
];

const CREATOR_TYPES = [
  { value: "content_creator", label: "Créateur de contenu", icon: Sparkles, emoji: "✨" },
  { value: "marketer", label: "Marketeur", icon: Megaphone, emoji: "📢" },
  { value: "entrepreneur", label: "Entrepreneur", icon: Briefcase, emoji: "💼" },
  { value: "trend_explorer", label: "Explorateur de tendances", icon: Compass, emoji: "🔍" },
];

const ANALYSIS_STEPS = [
  "analyse des hooks tendances",
  "analyse des formats viraux",
  "analyse de l'engagement dans la niche",
  "calcul du score de viralité",
];

function formatLabel(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ViralIdea {
  topic: string;
  hook: string;
  format: string;
  structure: string;
  viralityScore: number;
}

function AnimatedScore({ target }: { target: number }) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return <span>{current}</span>;
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [creatorType, setCreatorType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [viralIdea, setViralIdea] = useState<ViralIdea | null>(null);
  const [ideaError, setIdeaError] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if ((user as any)?.isAdmin) {
      setLocation("/system/founder");
    }
  }, [user, setLocation]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    window.location.href = "/";
  };

  const toggleNiche = (value: string) => {
    setSelectedNiches((prev) => {
      if (prev.includes(value)) return prev.filter((n) => n !== value);
      if (prev.length >= 3) return prev;
      return [...prev, value];
    });
  };

  const handleTopicsSubmit = async () => {
    if (selectedNiches.length === 0) return;
    setIsSubmitting(true);

    try {
      await apiRequest("PATCH", "/api/user/preferences", {
        selectedNiches,
        userGoal: creatorType || "content_creator",
        onboardingCompleted: true,
      });
    } catch {
      try {
        await apiRequest("PATCH", "/api/user/preferences", {
          onboardingCompleted: true,
        });
      } catch {}
    }

    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    setIsSubmitting(false);
    setStep(3);
  };

  const ideaReadyRef = useRef(false);
  const animDoneRef = useRef(false);

  useEffect(() => {
    if (step !== 3) return;

    setAnalysisStep(-1);
    setIdeaError(false);
    ideaReadyRef.current = false;
    animDoneRef.current = false;

    let cancelled = false;

    const tryAdvance = () => {
      if (ideaReadyRef.current && animDoneRef.current && !cancelled) {
        setStep(4);
      }
    };

    const generateIdea = async () => {
      try {
        const resp = await apiRequest("POST", "/api/onboarding/generate-idea", {
          niches: selectedNiches,
          creatorType: creatorType || "content_creator",
        });
        if (cancelled) return;
        const data = await resp.json();
        setViralIdea(data);
        ideaReadyRef.current = true;
        tryAdvance();
      } catch {
        if (!cancelled) {
          setIdeaError(true);
          ideaReadyRef.current = true;
          tryAdvance();
        }
      }
    };

    generateIdea();

    const delays = [400, 900, 1500, 2200];
    const timers = delays.map((delay, idx) =>
      setTimeout(() => {
        if (!cancelled) setAnalysisStep(idx);
      }, delay)
    );

    const animTimer = setTimeout(() => {
      if (!cancelled) {
        animDoneRef.current = true;
        tryAdvance();
      }
    }, 3000);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearTimeout(animTimer);
    };
  }, [step, selectedNiches, creatorType]);

  const handleCreateViralVideo = () => {
    if (!viralIdea) return;
    const params = new URLSearchParams();
    params.set("hook", viralIdea.hook);
    params.set("format", viralIdea.format);
    params.set("topic", viralIdea.topic);
    if (viralIdea.structure) params.set("structure", viralIdea.structure);
    window.location.href = `/create?${params.toString()}`;
  };

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  const slideVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative flex flex-col overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#7C5CFF]/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#7C5CFF]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full h-1 bg-gray-800">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          data-testid="progress-bar"
        />
      </div>

      <div className="absolute top-4 right-6 z-20">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-sm"
          data-testid="button-logout-onboarding"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg relative z-10">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex flex-col items-center text-center"
                data-testid="step-welcome"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-8"
                >
                  <Sparkles className="w-10 h-10 text-violet-500" />
                </motion.div>
                <h1 className="text-[34px] font-bold mb-4 leading-tight" data-testid="text-welcome-heading">
                  Créer des vidéos virales avec l'IA
                </h1>
                <p className="text-white/50 text-[17px] mb-10 max-w-md leading-relaxed" data-testid="text-welcome-subtitle">
                  Répondez à 3 questions rapides et obtenez votre première idée de vidéo virale.
                </p>
                <Button
                  onClick={() => setStep(1)}
                  className="h-14 px-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-base rounded-xl transition-all"
                  data-testid="button-get-started"
                >
                  Commencer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                data-testid="step-role"
              >
                <h2 className="text-[26px] font-bold mb-2 text-center leading-tight" data-testid="text-role-heading">
                  Comment créez-vous du contenu ?
                </h2>
                <p className="text-white/50 text-base mb-6 text-center" data-testid="text-role-subtitle">
                  Cela nous aide à personnaliser vos recommandations.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {CREATOR_TYPES.map((ct) => {
                    const selected = creatorType === ct.value;
                    return (
                      <button
                        key={ct.value}
                        onClick={() => setCreatorType(ct.value)}
                        className={`flex flex-col items-center gap-3 p-6 rounded-xl border transition-all ${
                          selected
                            ? "bg-[#7C5CFF]/15 border-[#7C5CFF] text-white"
                            : "bg-white/5 border-white/10 text-white/70 hover:border-white/25 hover:text-white"
                        }`}
                        data-testid={`card-role-${ct.value}`}
                      >
                        <span className="text-2xl">{ct.emoji}</span>
                        <span className="text-sm font-medium">{ct.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!creatorType}
                    className="bg-[#7C5CFF] hover:bg-[#6B4FE0] text-white px-8 text-base"
                    data-testid="button-role-continue"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                data-testid="step-topics"
              >
                <h2 className="text-[26px] font-bold mb-2 text-center leading-tight" data-testid="text-topics-heading">
                  Quels sujets de contenu créez-vous ?
                </h2>
                <p className="text-white/50 text-base mb-6 text-center" data-testid="text-topics-subtitle">
                  Sélectionnez jusqu'à 3 niches pour que nous puissions trouver des idées virales pour vous.
                </p>

                <div className="flex flex-wrap gap-3 justify-center mb-8">
                  {NICHES.map((niche) => {
                    const selected = selectedNiches.includes(niche.value);
                    return (
                      <button
                        key={niche.value}
                        onClick={() => toggleNiche(niche.value)}
                        className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all border ${
                          selected
                            ? "bg-[#7C5CFF]/15 border-[#7C5CFF] text-white"
                            : "bg-white/5 border-white/10 text-white/70 hover:border-white/25 hover:text-white"
                        }`}
                        data-testid={`chip-niche-${niche.value}`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 inline mr-1.5" />}
                        {niche.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleTopicsSubmit}
                    disabled={selectedNiches.length === 0 || isSubmitting}
                    className="bg-[#7C5CFF] hover:bg-[#6B4FE0] text-white px-8 text-base"
                    data-testid="button-topics-continue"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex flex-col items-center text-center"
                data-testid="step-analysis"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 flex items-center justify-center mb-8">
                  <TrendingUp className="w-8 h-8 text-[#7C5CFF] animate-pulse" />
                </div>
                <h2 className="text-[26px] font-bold mb-8 leading-tight" data-testid="text-analysis-heading">
                  Analyse des patterns viraux dans votre niche...
                </h2>

                <div className="space-y-4 w-full max-w-sm text-left">
                  {ANALYSIS_STEPS.map((label, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={analysisStep >= idx ? { opacity: 1, x: 0 } : { opacity: 0.2, x: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="flex items-center gap-3"
                      data-testid={`analysis-step-${idx}`}
                    >
                      {analysisStep >= idx ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                        </div>
                      )}
                      <span className={`text-base ${analysisStep >= idx ? "text-white" : "text-white/30"}`}>
                        {analysisStep >= idx ? "✓" : "○"} {label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-4"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex flex-col items-center text-center"
                data-testid="step-viral-idea"
              >
                <h2 className="text-[26px] font-bold mb-6 flex items-center gap-2 leading-tight" data-testid="text-viral-idea-heading">
                  <Flame className="w-6 h-6 text-orange-500" />
                  Votre première idée de vidéo virale
                </h2>

                {!viralIdea && !ideaError && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Loader2 className="w-8 h-8 text-[#7C5CFF] animate-spin" />
                    <p className="text-white/50 text-base">Génération en cours...</p>
                  </div>
                )}

                {ideaError && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <p className="text-white/50 text-base">Une erreur est survenue. Voici une idée par défaut :</p>
                    <IdeaCard
                      idea={{
                        topic: selectedNiches[0] || "ai_tools",
                        hook: "3 outils IA dont personne ne parle",
                        format: "listicle",
                        structure: "Hook → Montrer les outils → Démo → CTA",
                        viralityScore: 78,
                      }}
                      onCreateClick={handleCreateViralVideo}
                    />
                  </div>
                )}

                {viralIdea && !ideaError && (
                  <IdeaCard idea={viralIdea} onCreateClick={handleCreateViralVideo} />
                )}

                <button
                  onClick={() => { window.location.href = "/home"; }}
                  className="mt-4 text-white/40 text-sm hover:text-white/60 transition-colors"
                  data-testid="button-skip-to-home"
                >
                  Passer et aller au tableau de bord →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function IdeaCard({
  idea,
  onCreateClick,
}: {
  idea: ViralIdea;
  onCreateClick: () => void;
}) {
  const predicted = getPredictedViews(idea.viralityScore);
  const viralityColorClass = getViralityColor(idea.viralityScore);

  return (
    <div
      className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
      data-testid="card-viral-idea"
    >
      <div className="p-6 space-y-5">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-white/40 font-medium">Topic</span>
          <p className="text-base text-[#7C5CFF] font-semibold" data-testid="text-idea-topic">
            {formatLabel(idea.topic)}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-white/40 font-medium">Hook</span>
          <p className="text-xl font-bold text-white leading-snug" data-testid="text-idea-hook">
            "{idea.hook}"
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-white/40 font-medium">Format</span>
          <p className="text-base text-white/80" data-testid="text-idea-format">
            {formatLabel(idea.format)}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-white/40 font-medium">Score de viralité</span>
            <div className={`text-2xl font-bold ${viralityColorClass}`} data-testid="text-idea-score">
              <AnimatedScore target={idea.viralityScore} />
            </div>
          </div>

          <div className="space-y-1 text-right">
            <span className="text-xs uppercase tracking-wider text-white/40 font-medium">Vues prédites</span>
            <p className="text-base font-semibold text-white/80 flex items-center gap-1 justify-end" data-testid="text-idea-predicted">
              <Eye className="w-4 h-4" />
              {predicted.label}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <Button
          className="w-full bg-[#7C5CFF] hover:bg-[#6B4FE0] text-white font-semibold text-base py-5"
          onClick={onCreateClick}
          data-testid="button-create-viral-video"
        >
          <Play className="w-5 h-5 mr-2 fill-white" />
          Créer la vidéo virale
        </Button>
      </div>
    </div>
  );
}
