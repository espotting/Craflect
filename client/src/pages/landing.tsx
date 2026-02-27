import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import {
  Sparkles,
  ArrowRight,
  Eye,
  Brain,
  Target,
  Pencil,
  Sun,
  Moon,
  UserCircle2,
  Zap,
  TrendingUp,
  BarChart3,
  Clock,
  MessageSquare,
  Link2,
  Search,
  FileText,
  ChevronRight,
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import logoLight from "@/assets/logo-light.png";
import logoTransparent from "@/assets/logo-transparent.png";

const MOCK_HOOKS = [
  { text: "\"You've been doing this wrong your whole life...\"", score: 92 },
  { text: "\"Nobody talks about this but...\"", score: 87 },
  { text: "\"I tested this for 30 days — here's what happened\"", score: 84 },
  { text: "\"Stop scrolling — this will change everything\"", score: 79 },
];

const MOCK_BRIEF = {
  title: "High-Retention Storytelling Hook",
  hook: "\"I almost gave up on content creation until I discovered this one pattern...\"",
  structure: "Hook → Personal story → Pattern reveal → CTA",
  cta: "Comment 'PATTERN' and I'll send you the full breakdown",
  platforms: ["TikTok", "Reels", "Shorts"],
};

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          el.classList.add("in-view");
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}

function SectionReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <nav className="relative z-10 w-full px-4 sm:px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={isDark ? logoTransparent : logoLight} alt="Craflect" className="h-8 w-auto object-contain" data-testid="logo-landing" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-muted hover:bg-accent text-foreground transition-all border border-border"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            data-testid="button-theme-toggle-landing"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setLocation("/auth?mode=login")}
            className="p-2.5 rounded-full bg-muted hover:bg-accent text-foreground transition-all border border-border"
            title="Log in"
            data-testid="button-login-nav"
          >
            <UserCircle2 className="w-5 h-5" />
          </button>
          <Button
            className="rounded-full px-6 sm:px-8 bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20 transition-all hover:scale-105 font-medium"
            onClick={() => setLocation("/auth")}
            data-testid="button-signin-nav"
          >
            Sign up
          </Button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col">

        <section className="relative flex flex-col items-center justify-center px-4 text-center pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 dark:bg-secondary/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-4xl mx-auto relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted dark:bg-white/5 border border-border dark:border-white/10 text-sm font-medium text-primary mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Content Performance Intelligence</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              Show me what works <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#8b5cf6] to-secondary">
                Tell me what to post
              </span>
              <br className="hidden md:block" />
              Create it for me
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
              Identify winning short-form video patterns in your niche and turn them into optimized content.
            </p>

            <div className="flex items-center justify-center gap-3 mb-10">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SiTiktok className="w-3.5 h-3.5" />
                <span>TikTok</span>
              </div>
              <span className="text-muted-foreground/30">·</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SiInstagram className="w-3.5 h-3.5" />
                <span>Reels</span>
              </div>
              <span className="text-muted-foreground/30">·</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SiYoutube className="w-3.5 h-3.5" />
                <span>Shorts</span>
              </div>
            </div>

            <Button
              size="lg"
              className="rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 gap-3"
              onClick={() => setLocation("/auth")}
              data-testid="button-get-started"
            >
              Get started free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </section>

        <section className="px-4 py-12 sm:py-16 max-w-5xl mx-auto w-full">
          <SectionReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Eye, title: "Observe", desc: "Paste any video or competitor" },
                { icon: Brain, title: "Understand", desc: "Detect winning patterns" },
                { icon: Target, title: "Recommend", desc: "Get actionable ideas" },
                { icon: Pencil, title: "Produce", desc: "Generate optimized scripts" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="p-4 sm:p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
                  data-testid={`card-engine-${i}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <h3 className="text-sm sm:text-base font-display font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </SectionReveal>
        </section>

        <section className="px-4 py-16 sm:py-24 bg-muted/30 dark:bg-muted/10 border-y border-border">
          <div className="max-w-5xl mx-auto w-full">
            <SectionReveal>
              <div className="text-center mb-10 sm:mb-14">
                <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Product Preview
                </Badge>
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3" data-testid="text-proof-title">
                  See what Craflect generates
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
                  Real output from analyzing short-form video content.
                </p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <SectionReveal delay={0.1} className="lg:col-span-1">
                <Card className="border-border bg-card h-full">
                  <CardContent className="p-5 sm:p-6 space-y-5">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Niche Insights</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border">
                        <span className="text-xs text-muted-foreground">Top format</span>
                        <span className="text-sm font-semibold text-foreground" data-testid="text-mock-format">Face-cam storytelling</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border">
                        <span className="text-xs text-muted-foreground">Avg duration</span>
                        <span className="text-sm font-semibold text-foreground" data-testid="text-mock-duration">32s</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border">
                        <span className="text-xs text-muted-foreground">Hook style</span>
                        <span className="text-sm font-semibold text-foreground" data-testid="text-mock-hook-style">Curiosity-driven</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border">
                        <span className="text-xs text-muted-foreground">Avg score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: "78%" }} />
                          </div>
                          <span className="text-sm font-semibold text-foreground">78</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>

              <SectionReveal delay={0.2} className="lg:col-span-1">
                <Card className="border-border bg-card h-full">
                  <CardContent className="p-5 sm:p-6 space-y-5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Winning Hooks</h3>
                    </div>
                    <div className="space-y-2.5">
                      {MOCK_HOOKS.map((hook, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border"
                          data-testid={`mock-hook-${i}`}
                        >
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground leading-snug">{hook.text}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${hook.score}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium">{hook.score}/100</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>

              <SectionReveal delay={0.3} className="lg:col-span-1">
                <Card className="border-primary/20 bg-card h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <CardContent className="p-5 sm:p-6 space-y-5 relative z-10">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Generated Brief</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Title</span>
                        <p className="text-sm font-semibold text-foreground mt-0.5" data-testid="text-mock-brief-title">{MOCK_BRIEF.title}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Hook</span>
                        <p className="text-sm text-foreground/80 italic mt-0.5" data-testid="text-mock-brief-hook">{MOCK_BRIEF.hook}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Structure</span>
                        <p className="text-sm text-foreground/80 mt-0.5">{MOCK_BRIEF.structure}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">CTA</span>
                        <p className="text-sm text-foreground/80 mt-0.5">{MOCK_BRIEF.cta}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {MOCK_BRIEF.platforms.map((p) => (
                          <Badge key={p} variant="secondary" className="text-[10px] px-2 py-0.5" data-testid={`badge-platform-${p.toLowerCase()}`}>
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>
            </div>

            <SectionReveal delay={0.4}>
              <div className="flex justify-center mt-8 sm:mt-10">
                <Button
                  size="lg"
                  className="rounded-full px-8 h-12 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 gap-2"
                  onClick={() => setLocation("/auth")}
                  data-testid="button-generate-first-brief"
                >
                  Generate your first brief
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </SectionReveal>
          </div>
        </section>

        <section className="px-4 py-16 sm:py-24 max-w-4xl mx-auto w-full">
          <SectionReveal>
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3" data-testid="text-positioning-title">
                Not another content generator
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
                Craflect understands your niche before creating.
              </p>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {[
              {
                icon: Brain,
                title: "Pattern intelligence",
                desc: "Detects winning hooks, formats, and structures from real performance data.",
              },
              {
                icon: TrendingUp,
                title: "Niche learning",
                desc: "Gets smarter with every video analyzed. Recommendations improve automatically.",
              },
              {
                icon: Sparkles,
                title: "Continuous optimization",
                desc: "Every brief adapts to what's currently working in your niche.",
              },
              {
                icon: BarChart3,
                title: "Cross-platform short-form",
                desc: "One analysis covers TikTok, Reels, and Shorts simultaneously.",
              },
            ].map((item, i) => (
              <SectionReveal key={i} delay={i * 0.1}>
                <div
                  className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
                  data-testid={`card-positioning-${i}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:py-24 bg-muted/30 dark:bg-muted/10 border-t border-border">
          <div className="max-w-4xl mx-auto w-full">
            <SectionReveal>
              <div className="text-center mb-10 sm:mb-14">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3" data-testid="text-howitworks-title">
                  How it works
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">Three steps to your first optimized content.</p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  step: "1",
                  icon: Link2,
                  title: "Add a video or creator",
                  desc: "Paste a TikTok, Reel, or Short URL. Or a creator profile to analyze their niche.",
                },
                {
                  step: "2",
                  icon: Search,
                  title: "Craflect analyzes your niche",
                  desc: "AI extracts hooks, formats, structures, and identifies what makes content perform.",
                },
                {
                  step: "3",
                  icon: FileText,
                  title: "Generate optimized content",
                  desc: "Get briefs, hooks, and scripts built on proven patterns from your niche.",
                },
              ].map((item, i) => (
                <SectionReveal key={i} delay={i * 0.15}>
                  <div className="flex flex-col items-center text-center" data-testid={`card-howitworks-${i}`}>
                    <div className="relative mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-display font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{item.desc}</p>
                  </div>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.5}>
              <div className="flex justify-center mt-10 sm:mt-14">
                <Button
                  size="lg"
                  className="rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 gap-3"
                  onClick={() => setLocation("/auth")}
                  data-testid="button-bottom-cta"
                >
                  Get started free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </SectionReveal>
          </div>
        </section>

        <footer className="px-4 py-8 border-t border-border">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={isDark ? logoTransparent : logoLight} alt="Craflect" className="h-6 w-auto" />
              <span className="text-xs text-muted-foreground">Content Performance Intelligence</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Craflect. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
