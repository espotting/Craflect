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
  Link2,
  Search,
  FileText,
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

function AnimatedBar({ width, delay = 0 }: { width: string; delay?: number }) {
  return (
    <motion.div
      className="h-full bg-primary rounded-full"
      initial={{ width: 0 }}
      whileInView={{ width }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
    />
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

        <section className="relative flex flex-col items-center justify-center px-4 text-center pt-12 sm:pt-20 pb-12 sm:pb-16">
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

        <section className="px-4 py-10 sm:py-12 max-w-3xl mx-auto w-full">
          <SectionReveal>
            <div className="text-center space-y-3">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground" data-testid="text-insight-statement">
                Reverse-engineer what performs before you create.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Craflect analyzes real short-form video performance to generate content based on proven patterns.
              </p>
            </div>
          </SectionReveal>
        </section>

        <section className="px-4 pb-10 sm:pb-12 max-w-4xl mx-auto w-full">
          <SectionReveal>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[
                { icon: Eye, title: "Observe", desc: "Add video or competitor" },
                { icon: Brain, title: "Understand", desc: "Detect winning patterns" },
                { icon: Target, title: "Recommend", desc: "Get actionable ideas" },
                { icon: Pencil, title: "Produce", desc: "Generate optimized scripts" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  className="p-3 sm:p-4 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/50 text-center group hover:border-primary/20 transition-colors"
                  data-testid={`card-engine-${i}`}
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/15 transition-colors">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-display font-bold text-foreground">{item.title}</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </SectionReveal>
        </section>

        <section className="px-4 py-16 sm:py-24 relative">
          <div className="absolute inset-0 bg-muted/40 dark:bg-muted/15 border-y border-border pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/3 dark:bg-primary/5 rounded-full blur-[200px]" />
          </div>

          <div className="max-w-6xl mx-auto w-full relative z-10">
            <SectionReveal>
              <div className="text-center mb-10 sm:mb-14">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/15 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4">
                  <Eye className="w-3 h-3" />
                  Real product preview
                </span>
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3" data-testid="text-proof-title">
                  See what Craflect generates
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                  Real output from analyzing short-form video content.
                </p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
              <SectionReveal delay={0.1} className="lg:col-span-1">
                <Card className="border-border bg-card shadow-lg dark:shadow-primary/5 h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Niche Insights</h3>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: "Top format", value: "Face-cam storytelling", testid: "text-mock-format" },
                        { label: "Avg duration", value: "32s", testid: "text-mock-duration" },
                        { label: "Hook style", value: "Curiosity-driven", testid: "text-mock-hook-style" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 dark:bg-muted/30 border border-border/60">
                          <span className="text-[11px] text-muted-foreground">{row.label}</span>
                          <span className="text-xs sm:text-sm font-semibold text-foreground" data-testid={row.testid}>{row.value}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 dark:bg-muted/30 border border-border/60">
                        <span className="text-[11px] text-muted-foreground">Avg score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <AnimatedBar width="78%" delay={0.3} />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-foreground">78</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>

              <SectionReveal delay={0.2} className="lg:col-span-1">
                <Card className="border-border bg-card shadow-lg dark:shadow-primary/5 h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Winning Hooks</h3>
                    </div>
                    <div className="space-y-2">
                      {MOCK_HOOKS.map((hook, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                          className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/50 dark:bg-muted/30 border border-border/60 hover:border-primary/20 transition-colors group"
                          data-testid={`mock-hook-${i}`}
                        >
                          <span className="w-5 h-5 rounded-full bg-primary/10 group-hover:bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 transition-colors">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-foreground leading-snug">{hook.text}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                                <AnimatedBar width={`${hook.score}%`} delay={0.5 + i * 0.1} />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium">{hook.score}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>

              <SectionReveal delay={0.3} className="lg:col-span-1">
                <Card className="border-primary/20 bg-card shadow-lg shadow-primary/5 dark:shadow-primary/10 h-full relative overflow-hidden hover:shadow-xl hover:shadow-primary/10 transition-shadow">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 dark:bg-primary/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <CardContent className="p-5 sm:p-6 space-y-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Generated Brief</h3>
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
              <div className="flex justify-center mt-10 sm:mt-12">
                <Button
                  size="lg"
                  className="rounded-full px-8 h-13 bg-primary hover:bg-primary/90 text-white font-semibold text-base shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 gap-2"
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

        <section className="px-4 py-16 sm:py-20 max-w-4xl mx-auto w-full">
          <SectionReveal>
            <div className="text-center mb-8 sm:mb-10">
              <p className="text-xs sm:text-sm font-medium uppercase tracking-widest text-primary mb-2">Why Craflect is different</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-positioning-title">
                Not another content generator
              </h2>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              { icon: Brain, title: "Pattern intelligence", desc: "Detects winning hooks, formats, and structures from real data." },
              { icon: TrendingUp, title: "Niche learning", desc: "Gets smarter with every video analyzed." },
              { icon: Sparkles, title: "Continuous optimization", desc: "Every brief adapts to what's working now." },
              { icon: BarChart3, title: "Cross-platform short-form", desc: "One analysis covers TikTok, Reels, and Shorts." },
            ].map((item, i) => (
              <SectionReveal key={i} delay={i * 0.08}>
                <div
                  className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors"
                  data-testid={`card-positioning-${i}`}
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:py-20 bg-muted/30 dark:bg-muted/10 border-t border-border">
          <div className="max-w-4xl mx-auto w-full">
            <SectionReveal>
              <div className="text-center mb-10 sm:mb-12">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-howitworks-title">
                  How it works
                </h2>
                <p className="text-sm text-muted-foreground">Three steps. Your first brief in under 60 seconds.</p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              {[
                { step: "1", icon: Link2, title: "Add a video or creator", desc: "Paste any TikTok, Reel, or Short URL." },
                { step: "2", icon: Search, title: "Craflect analyzes your niche", desc: "AI extracts hooks, formats, and patterns." },
                { step: "3", icon: FileText, title: "Generate optimized content", desc: "Get briefs and scripts based on what works." },
              ].map((item, i) => (
                <SectionReveal key={i} delay={i * 0.12}>
                  <div className="flex flex-col items-center text-center" data-testid={`card-howitworks-${i}`}>
                    <div className="relative mb-5">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-7 h-7 text-primary" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-base font-display font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground max-w-[220px]">{item.desc}</p>
                  </div>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.4}>
              <div className="flex justify-center mt-10 sm:mt-14">
                <Button
                  size="lg"
                  className="rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 gap-3"
                  onClick={() => setLocation("/auth")}
                  data-testid="button-bottom-cta"
                >
                  Generate your first brief
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
