import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  FolderKanban,
  FileText,
  Check,
} from "lucide-react";
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

const STEPS = [
  { label: "Create workspace", icon: FolderKanban },
  { label: "Add source", icon: FileText },
  { label: "Generate brief", icon: Sparkles },
];

export default function Welcome() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isDark } = useTheme();

  const [step, setStep] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("");
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [briefGenerated, setBriefGenerated] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
    if (!authLoading && user?.onboardingCompleted) {
      setLocation("/dashboard");
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2500);
    return () => clearTimeout(timer);
  }, []);

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

  const handleAddSource = useCallback(async () => {
    if (!sourceTitle.trim() || !sourceContent.trim() || !createdWorkspaceId) return;
    setIsSubmitting(true);
    try {
      await apiRequest("POST", `/api/workspaces/${createdWorkspaceId}/sources`, {
        title: sourceTitle,
        type: "text",
        rawContent: sourceContent,
      });
      toast({ title: "Source added", description: "Your content is ready for AI processing." });
      setStep(2);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add source", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [sourceTitle, sourceContent, createdWorkspaceId, toast]);

  const handleGenerateBrief = useCallback(async () => {
    if (!createdWorkspaceId) return;
    setIsSubmitting(true);
    try {
      await apiRequest("POST", `/api/workspaces/${createdWorkspaceId}/briefs/generate`);
      setBriefGenerated(true);
      setShowConfetti(true);
      toast({ title: "Brief generated!", description: "Your first AI brief is ready." });

      await apiRequest("PATCH", "/api/auth/user", { onboardingCompleted: true });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      setTimeout(() => {
        setLocation("/dashboard");
      }, 3500);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate brief", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [createdWorkspaceId, toast, setLocation]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const progressValue = showIntro ? 0 : ((step + (briefGenerated ? 1 : 0)) / 3) * 100;
  const firstName = user.firstName || "Creator";

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {showConfetti && <ConfettiCanvas />}

      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 dark:bg-secondary/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

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
              className="text-muted-foreground text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              Let's set up your content engine in 3 steps.
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
                  Step {step + 1} of 3
                </span>
              </div>
              <Progress value={progressValue} className="h-1.5 bg-muted" />

              <div className="flex items-center gap-2 mt-6 mb-2">
                {STEPS.map((s, i) => {
                  const done = i < step || (i === 2 && briefGenerated);
                  const active = i === step && !briefGenerated;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        done
                          ? "bg-primary/10 text-primary"
                          : active
                          ? "bg-accent text-foreground"
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
                  <Card className="border-border">
                    <CardContent className="p-8 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                          <FolderKanban className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-step-title">
                            Create your workspace
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            A workspace organizes content for a specific brand or project.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Workspace name
                        </label>
                        <Input
                          placeholder="e.g. My Brand, Acme Corp"
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
                        Create workspace
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
                  <Card className="border-border">
                    <CardContent className="p-8 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-step-title">
                            Add your first source
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Paste text content or a URL. The AI will repurpose it for you.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">
                            Title
                          </label>
                          <Input
                            placeholder="e.g. My latest video transcript"
                            value={sourceTitle}
                            onChange={(e) => setSourceTitle(e.target.value)}
                            className="bg-background border-border text-foreground"
                            autoFocus
                            data-testid="input-onboarding-source-title"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">
                            Content
                          </label>
                          <Textarea
                            placeholder="Paste your text content, transcript, or link here..."
                            value={sourceContent}
                            onChange={(e) => setSourceContent(e.target.value)}
                            className="bg-background border-border text-foreground min-h-[140px] resize-none"
                            data-testid="input-onboarding-source-content"
                          />
                        </div>
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
                          onClick={handleAddSource}
                          disabled={isSubmitting || !sourceTitle.trim() || !sourceContent.trim()}
                          className="flex-1"
                          data-testid="button-onboarding-add-source"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Add source
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  className="w-full max-w-lg"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.35 }}
                >
                  <Card className="border-border">
                    <CardContent className="p-8 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-step-title">
                            {briefGenerated ? "You're all set!" : "Generate your first brief"}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {briefGenerated
                              ? "Your AI content engine is ready. Redirecting to dashboard..."
                              : "Watch the AI create a personalized content brief from your source."}
                          </p>
                        </div>
                      </div>

                      {briefGenerated ? (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="flex flex-col items-center py-8"
                        >
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Check className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-lg font-display font-bold text-foreground mb-1" data-testid="text-onboarding-complete">
                            Onboarding complete
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Taking you to your dashboard...
                          </p>
                        </motion.div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 p-4 rounded-md bg-muted border border-border text-sm text-muted-foreground">
                            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                            The AI will analyze your source content and generate a tailored brief with topic, hook, and script.
                          </div>

                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setStep(1)}
                              data-testid="button-onboarding-back-2"
                            >
                              <ArrowLeft className="w-4 h-4 mr-2" />
                              Back
                            </Button>
                            <Button
                              onClick={handleGenerateBrief}
                              disabled={isSubmitting}
                              className="flex-1"
                              data-testid="button-onboarding-generate"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                              )}
                              Generate brief
                            </Button>
                          </div>
                        </>
                      )}
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
