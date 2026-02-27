import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  FolderKanban,
  Link2,
  Check,
  Plus,
  X,
  TrendingUp,
  BarChart3,
  Target,
  Eye,
  Brain,
  Zap,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import logoTransparent from "@/assets/logo-transparent.png";
import logoLight from "@/assets/logo-light.png";
import { useTheme } from "@/hooks/use-theme";

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      "#7C5CFF",
      "#a78bfa",
      "#c084fc",
      "#f472b6",
      "#38bdf8",
      "#34d399",
      "#fbbf24",
    ];

    interface Particle {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      vx: number;
      vy: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    let animationId: number;
    let frame = 0;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vy += 0.05;
        if (frame > 60) {
          p.opacity = Math.max(0, p.opacity - 0.005);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (particles.every((p) => p.opacity <= 0)) return;
      animationId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}

function detectPlatformFromUrl(url: string): string | null {
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/instagram\.com|instagr\.am/i.test(url)) return "instagram";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  return null;
}

function PlatformIcon({ platform, className }: { platform: string | null; className?: string }) {
  switch (platform) {
    case "tiktok":
      return <SiTiktok className={className} />;
    case "instagram":
      return <SiInstagram className={className} />;
    case "youtube":
      return <SiYoutube className={className} />;
    default:
      return <Link2 className={className} />;
  }
}

const STEPS = [
  { label: "Your niche", icon: FolderKanban },
  { label: "Add source", icon: Link2 },
  { label: "AI analysis", icon: Brain },
  { label: "First results", icon: Sparkles },
];

const LOADER_MESSAGES = [
  { text: "Extracting video structure...", icon: Eye, delay: 0 },
  { text: "Identifying hooks...", icon: Zap, delay: 2500 },
  { text: "Detecting patterns in your niche...", icon: Brain, delay: 5000 },
  { text: "Generating winning angles...", icon: Target, delay: 8000 },
  { text: "Building your first content brief...", icon: Sparkles, delay: 11000 },
];

const MICRO_INSIGHTS = [
  "Storytelling hooks perform best in your niche",
  "Videos under 45s get higher retention",
  "We found 3 winning patterns in your niche",
  "Your top hook style is curiosity-driven",
];

export default function Welcome() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();

  const [step, setStep] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("");
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [createdSourceIds, setCreatedSourceIds] = useState<string[]>([]);

  const [loaderMessageIndex, setLoaderMessageIndex] = useState(0);
  const [microInsightIndex, setMicroInsightIndex] = useState(0);
  const [showMicroInsight, setShowMicroInsight] = useState(false);

  const [insightData, setInsightData] = useState<{
    topic?: string;
    hook?: string;
    format?: string;
    angles?: string[];
    hooks?: string[];
    formats?: string[];
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleSkipOnboarding = useCallback(async () => {
    try {
      await apiRequest("PATCH", "/api/auth/user", { onboardingCompleted: true });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/dashboard");
    } catch {
      setLocation("/dashboard");
    }
  }, [setLocation]);

  const handleCreateWorkspace = useCallback(async () => {
    if (!workspaceName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/workspaces", { name: workspaceName });
      const workspace = await res.json();
      setCreatedWorkspaceId(workspace.id);
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      toast({ title: "Workspace created", description: `"${workspaceName}" is ready.` });
      setStep(1);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create workspace", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [workspaceName, toast]);

  const handleAddUrl = useCallback(() => {
    setUrls((prev) => [...prev, ""]);
  }, []);

  const handleRemoveUrl = useCallback((index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUrlChange = useCallback((index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }, []);

  const validUrls = urls.filter((u) => u.trim().length > 0);

  const handleIngestUrls = useCallback(async () => {
    if (validUrls.length === 0 || !createdWorkspaceId) return;
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", `/api/workspaces/${createdWorkspaceId}/sources/ingest`, {
        urls: validUrls,
      });
      const sources = await res.json();
      const ids = sources.map((s: any) => s.id);
      setCreatedSourceIds(ids);
      toast({ title: "URLs added", description: `${sources.length} content source(s) ready for analysis.` });
      setStep(2);
      runAnalysisPipeline(ids);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to ingest URLs", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [validUrls, createdWorkspaceId, toast]);

  const runAnalysisPipeline = useCallback(async (sourceIds: string[]) => {
    setLoaderMessageIndex(0);
    setMicroInsightIndex(0);
    setShowMicroInsight(false);

    const loaderTimers: NodeJS.Timeout[] = [];
    for (let i = 1; i < LOADER_MESSAGES.length; i++) {
      const timer = setTimeout(() => {
        setLoaderMessageIndex(i);
      }, LOADER_MESSAGES[i].delay);
      loaderTimers.push(timer);
    }

    const microTimer1 = setTimeout(() => {
      setShowMicroInsight(true);
      setMicroInsightIndex(0);
    }, 4000);
    const microTimer2 = setTimeout(() => setMicroInsightIndex(1), 7000);
    const microTimer3 = setTimeout(() => setMicroInsightIndex(2), 10000);
    const microTimer4 = setTimeout(() => setMicroInsightIndex(3), 13000);
    loaderTimers.push(microTimer1, microTimer2, microTimer3, microTimer4);

    try {
      for (const sourceId of sourceIds) {
        try {
          await apiRequest("POST", `/api/sources/${sourceId}/analyze`);
        } catch {
          // continue
        }
      }

      if (createdWorkspaceId) {
        const res = await apiRequest("POST", `/api/workspaces/${createdWorkspaceId}/briefs/generate`);
        const insight = await res.json();

        let angles: string[] = [];
        let hooks: string[] = [];
        let formats: string[] = [];
        try {
          const insightsJson = typeof insight.insights === "string" ? JSON.parse(insight.insights) : insight.insights;
          if (insightsJson) {
            if (insightsJson.contentAngles) angles = insightsJson.contentAngles.map((a: any) => a.angle || a.name || a);
            if (insightsJson.topHooks) hooks = insightsJson.topHooks.map((h: any) => h.hook || h.name || h);
            if (insightsJson.winningFormats) formats = insightsJson.winningFormats.map((f: any) => f.format || f.name || f);
          }
        } catch {}

        setInsightData({
          topic: insight.topic,
          hook: insight.hook,
          format: insight.format,
          angles: angles.slice(0, 3),
          hooks: hooks.slice(0, 3),
          formats: formats.slice(0, 3),
        });
      }

      loaderTimers.forEach(clearTimeout);
      setShowConfetti(true);
      setStep(3);

      await apiRequest("PATCH", "/api/auth/user", { onboardingCompleted: true });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (err: any) {
      loaderTimers.forEach(clearTimeout);
      toast({ title: "Analysis error", description: err.message || "Something went wrong, but you can retry from the dashboard.", variant: "destructive" });
      await apiRequest("PATCH", "/api/auth/user", { onboardingCompleted: true }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setStep(3);
    }
  }, [createdWorkspaceId, toast]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const progressValue = showIntro ? 0 : ((step + (step === 3 ? 1 : 0)) / 4) * 100;
  const firstName = user.firstName || "Creator";

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {showConfetti && <ConfettiCanvas />}

      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 dark:bg-secondary/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-theme-toggle"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipOnboarding}
          className="text-muted-foreground hover:text-foreground text-xs"
          data-testid="button-skip-onboarding"
        >
          Skip
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro"
            className="flex flex-col items-center justify-center min-h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6 }}
          >
            <motion.img
              src={isDark ? logoTransparent : logoLight}
              alt="Craflect"
              className="h-16 w-auto mb-8"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              data-testid="img-welcome-logo"
            />
            <motion.h1
              className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              data-testid="text-welcome-greeting"
            >
              Welcome, {firstName}
            </motion.h1>
            <motion.p
              className="text-muted-foreground text-lg text-center max-w-md px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              Turn one video into weeks of content.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="steps"
            className="flex flex-col items-center min-h-screen px-4 py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full max-w-lg mb-10">
              <div className="flex items-center justify-between mb-4">
                <img
                  src={isDark ? logoTransparent : logoLight}
                  alt="Craflect"
                  className="h-8 w-auto"
                />
                <span className="text-sm text-muted-foreground font-medium">
                  Step {Math.min(step + 1, 4)} of 4
                </span>
              </div>
              <Progress value={progressValue} className="h-1.5 bg-muted" />

              <div className="flex items-center gap-1 mt-6 mb-2 flex-wrap">
                {STEPS.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        done
                          ? "bg-primary/10 dark:bg-primary/20 text-primary"
                          : active
                          ? "bg-accent dark:bg-accent text-foreground"
                          : "text-muted-foreground"
                      }`}
                      data-testid={`step-indicator-${i}`}
                    >
                      {done ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <s.icon className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step0"
                  className="w-full max-w-lg"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.35 }}
                >
                  <Card className="border-border bg-card">
                    <CardContent className="p-8 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                          <FolderKanban className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-step-title">
                            Describe your niche
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            We analyze real videos in your niche to find winning patterns and generate content ideas.
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-md bg-primary/5 dark:bg-primary/10 border border-primary/20 text-sm text-foreground/80">
                        <Sparkles className="w-4 h-4 text-primary inline mr-2" />
                        Next, you'll add creators or videos from your niche — we'll extract what makes them perform.
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          What's your niche?
                        </label>
                        <Input
                          placeholder="e.g. Fitness coaching, SaaS marketing, Skincare tips, Personal finance"
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          className="bg-background border-border text-foreground"
                          autoFocus
                          data-testid="input-onboarding-workspace"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateWorkspace();
                            }
                          }}
                        />
                        <p className="text-[11px] text-muted-foreground/60">
                          This helps us organize your analysis. You can change it later.
                        </p>
                      </div>

                      <Button
                        onClick={handleCreateWorkspace}
                        disabled={isSubmitting || !workspaceName.trim()}
                        className="w-full"
                        data-testid="button-onboarding-create-workspace"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  className="w-full max-w-lg"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.35 }}
                >
                  <Card className="border-border bg-card">
                    <CardContent className="p-8 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                          <Link2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-step-title">
                            Add videos or creators from your niche
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            We'll detect patterns across multiple videos — hooks, formats, and structures that drive performance.
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-md bg-primary/5 dark:bg-primary/10 border border-primary/20 text-sm text-foreground/80">
                        <Sparkles className="w-4 h-4 text-primary inline mr-2" />
                        Best results with 3–10 sources. Add your own videos, competitors, or viral content from your niche.
                      </div>

                      <div className="space-y-3">
                        {urls.map((url, index) => {
                          const platform = detectPlatformFromUrl(url);
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  <PlatformIcon platform={platform} className="w-4 h-4" />
                                </div>
                                <Input
                                  placeholder="https://www.tiktok.com/@creator/video/..."
                                  value={url}
                                  onChange={(e) => handleUrlChange(index, e.target.value)}
                                  className="bg-background border-border text-foreground pl-10"
                                  autoFocus={index === 0}
                                  data-testid={`input-onboarding-url-${index}`}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (validUrls.length > 0) {
                                        handleIngestUrls();
                                      }
                                    }
                                  }}
                                />
                              </div>
                              {platform && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0" data-testid={`badge-platform-${index}`}>
                                  {platform}
                                </Badge>
                              )}
                              {urls.length > 1 && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRemoveUrl(index)}
                                  data-testid={`button-remove-url-${index}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}

                        <Button
                          variant="outline"
                          onClick={handleAddUrl}
                          className="w-full"
                          data-testid="button-onboarding-add-url"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add more inspiration
                        </Button>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setStep(0)}
                          data-testid="button-onboarding-back"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button
                          onClick={handleIngestUrls}
                          disabled={isSubmitting || validUrls.length === 0}
                          className="flex-1"
                          data-testid="button-onboarding-ingest"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Find winning patterns
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2-loader"
                  className="w-full max-w-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="border-border bg-card overflow-hidden">
                    <CardContent className="p-8 space-y-8">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                            <Brain className="w-10 h-10 text-primary animate-pulse" />
                          </div>
                          <div className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-loader-title">
                          Analyzing your content...
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Craflect is understanding your niche right now.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {LOADER_MESSAGES.map((msg, i) => {
                          const isActive = i === loaderMessageIndex;
                          const isDone = i < loaderMessageIndex;
                          const IconComp = msg.icon;
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.1 }}
                              className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                                isActive
                                  ? "bg-primary/5 dark:bg-primary/10 border border-primary/20 text-foreground"
                                  : isDone
                                  ? "text-muted-foreground"
                                  : "text-muted-foreground/40"
                              }`}
                              data-testid={`loader-step-${i}`}
                            >
                              {isDone ? (
                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                              ) : isActive ? (
                                <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                              ) : (
                                <IconComp className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span className="text-sm font-medium">{msg.text}</span>
                            </motion.div>
                          );
                        })}
                      </div>

                      <AnimatePresence mode="wait">
                        {showMicroInsight && (
                          <motion.div
                            key={`micro-${microInsightIndex}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                            className="p-4 rounded-md bg-primary/5 dark:bg-primary/10 border border-primary/20"
                          >
                            <div className="flex items-start gap-3">
                              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Insight preview</span>
                                <p className="text-sm text-foreground mt-1" data-testid="text-micro-insight">
                                  {MICRO_INSIGHTS[microInsightIndex]}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3-results"
                  className="w-full max-w-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <Card className="border-primary/20 bg-card overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 dark:bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <CardContent className="p-8 space-y-6 relative z-10">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                          <Check className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-results-title">
                          Your first results are ready!
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Here's what Craflect found in your niche.
                        </p>
                      </div>

                      {insightData && (
                        <div className="space-y-4">
                          {insightData.topic && (
                            <div className="p-4 rounded-md bg-muted dark:bg-muted/50 border border-border">
                              <div className="flex items-start gap-3">
                                <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-foreground" data-testid="text-result-topic">
                                    {insightData.topic}
                                  </p>
                                  {insightData.hook && (
                                    <p className="text-sm text-muted-foreground" data-testid="text-result-hook">
                                      {insightData.hook}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {insightData.angles && insightData.angles.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Target className="w-3.5 h-3.5" />
                                Top content angles
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {insightData.angles.map((angle, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-angle-${i}`}>
                                    {typeof angle === "string" ? angle : String(angle)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {insightData.hooks && insightData.hooks.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5" />
                                Recommended hooks
                              </h4>
                              <div className="space-y-1.5">
                                {insightData.hooks.map((hook, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm text-foreground/80" data-testid={`text-hook-${i}`}>
                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                      {i + 1}
                                    </span>
                                    {typeof hook === "string" ? hook : String(hook)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {insightData.formats && insightData.formats.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <BarChart3 className="w-3.5 h-3.5" />
                                Suggested formats
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {insightData.formats.map((fmt, i) => (
                                  <Badge key={i} variant="outline" className="text-xs" data-testid={`badge-format-${i}`}>
                                    {typeof fmt === "string" ? fmt : String(fmt)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {insightData.format && (
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <span className="text-xs text-muted-foreground">1 brief generated</span>
                              <Badge variant="secondary" className="text-xs" data-testid="badge-brief-format">
                                {insightData.format}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-3 pt-2">
                        <Button
                          onClick={() => setLocation("/dashboard")}
                          className="w-full"
                          data-testid="button-go-dashboard"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Go to dashboard
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setLocation("/briefs")}
                          className="w-full"
                          data-testid="button-generate-more"
                        >
                          Generate more insights
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
