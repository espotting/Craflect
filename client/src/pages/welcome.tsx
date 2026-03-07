import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  Megaphone,
  Briefcase,
  Compass,
  Check,
  Loader2,
} from "lucide-react";

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

const GOALS = [
  { value: "content_creator", label: "Content Creator", icon: Sparkles },
  { value: "marketer", label: "Marketer", icon: Megaphone },
  { value: "business", label: "Business", icon: Briefcase },
  { value: "trend_explorer", label: "Trend Explorer", icon: Compass },
];

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [userGoal, setUserGoal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleNiche = (value: string) => {
    setSelectedNiches((prev) => {
      if (prev.includes(value)) return prev.filter((n) => n !== value);
      if (prev.length >= 3) return prev;
      return [...prev, value];
    });
  };

  const [onboardingSaved, setOnboardingSaved] = useState(false);

  const handleComplete = async (goal: string) => {
    setUserGoal(goal);
    setIsSubmitting(true);
    try {
      await apiRequest("PATCH", "/api/user/preferences", {
        selectedNiches,
        userGoal: goal,
        onboardingCompleted: true,
      });
      setOnboardingSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setStep(3);
    } catch (err) {
      console.error("Onboarding save failed:", err);
      try {
        await apiRequest("PATCH", "/api/user/preferences", {
          onboardingCompleted: true,
        });
        setOnboardingSaved(true);
      } catch {
        setOnboardingSaved(true);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { user } = useAuth();

  useEffect(() => {
    if (step === 3 && (user?.onboardingCompleted || onboardingSaved)) {
      const timer = setTimeout(() => setLocation("/home"), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, setLocation, user?.onboardingCompleted, onboardingSaved]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#7C5CFF]/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#7C5CFF]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="flex justify-center mb-8 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= step
                  ? "w-10 bg-[#7C5CFF]"
                  : "w-10 bg-white/10"
              }`}
              data-testid={`progress-indicator-${i}`}
            />
          ))}
        </div>

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
              <div className="w-16 h-16 rounded-2xl bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 flex items-center justify-center mb-8">
                <TrendingUp className="w-8 h-8 text-[#7C5CFF]" />
              </div>
              <h1
                className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
                data-testid="text-welcome-heading"
              >
                Discover viral trends before they explode
              </h1>
              <p
                className="text-white/50 text-lg mb-10 max-w-md"
                data-testid="text-welcome-subtitle"
              >
                Set up your profile in under 30 seconds and start spotting trends that matter to you.
              </p>
              <Button
                onClick={() => setStep(1)}
                className="bg-[#7C5CFF] hover:bg-[#6B4FE0] text-white px-8"
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
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
              data-testid="step-niches"
            >
              <h2
                className="text-2xl font-bold mb-2 text-center"
                data-testid="text-niches-heading"
              >
                What niches interest you?
              </h2>
              <p className="text-white/50 text-sm mb-6 text-center" data-testid="text-niches-subtitle">
                Select up to 3 niches to personalize your experience.
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
                  onClick={() => setStep(2)}
                  disabled={selectedNiches.length === 0}
                  className="bg-[#7C5CFF] hover:bg-[#6B4FE0] text-white px-8"
                  data-testid="button-niches-continue"
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
              data-testid="step-goal"
            >
              <h2
                className="text-2xl font-bold mb-2 text-center"
                data-testid="text-goal-heading"
              >
                What best describes you?
              </h2>
              <p className="text-white/50 text-sm mb-6 text-center" data-testid="text-goal-subtitle">
                This helps us tailor your dashboard.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {GOALS.map((goal) => {
                  const Icon = goal.icon;
                  const selected = userGoal === goal.value;
                  return (
                    <button
                      key={goal.value}
                      onClick={() => setUserGoal(goal.value)}
                      className={`flex flex-col items-center gap-3 p-6 rounded-md border transition-all ${
                        selected
                          ? "bg-[#7C5CFF]/15 border-[#7C5CFF] text-white"
                          : "bg-white/5 border-white/10 text-white/70 hover:border-white/25 hover:text-white"
                      }`}
                      data-testid={`card-goal-${goal.value}`}
                    >
                      <Icon className="w-7 h-7" />
                      <span className="text-sm font-medium">{goal.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={() => userGoal && handleComplete(userGoal)}
                  disabled={!userGoal || isSubmitting}
                  className="bg-[#7C5CFF] hover:bg-[#6B4FE0] text-white px-8"
                  data-testid="button-goal-continue"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Finish
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
              data-testid="step-success"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h2
                className="text-3xl font-bold mb-3"
                data-testid="text-success-heading"
              >
                You're all set!
              </h2>
              <p className="text-white/50 text-sm" data-testid="text-success-subtitle">
                Redirecting to your dashboard...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
