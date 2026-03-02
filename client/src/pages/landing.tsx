import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
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
  Play,
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";
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
  const { t, language } = useLanguage();
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">

      <motion.div
        initial={{ y: -60 }}
        animate={{ y: showSticky ? 0 : -60 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <img src={isDark ? logoTransparent : logoLight} alt="Craflect" className="h-8 w-auto" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/pricing")}
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
              data-testid="nav-pricing-sticky"
            >
              {t.nav.pricing}
            </button>
            <Button
              className="rounded-full px-6 h-9 bg-primary hover:bg-primary/90 text-white text-sm font-medium shadow-md shadow-primary/20 gap-2"
              onClick={() => setLocation("/auth")}
              data-testid="button-sticky-cta"
            >
              <Play className="w-3.5 h-3.5" />
              {t.nav.analyzeVideo}
            </Button>
          </div>
        </div>
      </motion.div>

      <nav className="relative z-10 w-full px-4 sm:px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={isDark ? logoTransparent : logoLight} alt="Craflect" className="h-10 w-auto object-contain" data-testid="logo-landing" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLocation("/pricing")}
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
            data-testid="nav-pricing"
          >
            {t.nav.pricing}
          </button>
          <LanguageSwitcher variant="icon" />
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
            {t.nav.signUp}
          </Button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col">

        <section className="relative flex flex-col items-center justify-center px-4 text-center pt-10 sm:pt-16 pb-8 sm:pb-12">
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
              <span>{t.landing.badge}</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-foreground mb-6 leading-tight whitespace-nowrap text-center">
              <span className="block">{t.landing.heroLine1}</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#8b5cf6] to-secondary">
                {t.landing.heroLine2}
              </span>
              <span className="block">{t.landing.heroLine3}</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-5 max-w-2xl mx-auto leading-relaxed">
              {t.landing.subtitle}
            </p>

            <div className="flex flex-col items-center gap-2 mb-8">
              <span className="text-[11px] text-muted-foreground/70 tracking-wide">{t.landing.analyzeFrom}</span>
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <SiTiktok className="w-3.5 h-3.5" style={{ color: isDark ? "rgba(178, 225, 232, 0.75)" : "rgba(0, 0, 0, 0.7)" }} />
                  <span>TikTok</span>
                </div>
                <span className="text-muted-foreground/30">•</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <SiInstagram className="w-3.5 h-3.5" style={{ color: "rgba(214, 100, 144, 0.75)" }} />
                  <span>Reels</span>
                </div>
                <span className="text-muted-foreground/30">•</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <SiYoutube className="w-3.5 h-3.5" style={{ color: "rgba(220, 60, 60, 0.75)" }} />
                  <span>Shorts</span>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 gap-3"
              onClick={() => setLocation("/auth")}
              data-testid="button-get-started"
            >
              {t.landing.ctaPaste}
              <ArrowRight className="w-5 h-5" />
            </Button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-6 text-xs sm:text-sm text-muted-foreground/70 font-medium tracking-wide"
              data-testid="text-flow-line"
            >
              {t.landing.flowLine}
            </motion.p>
          </motion.div>
        </section>

        <section className="px-4 pt-8 pb-6 sm:pt-10 sm:pb-8 max-w-4xl mx-auto w-full">
          <SectionReveal>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[
                { icon: Eye, title: t.landing.observe, desc: t.landing.observeDesc },
                { icon: Brain, title: t.landing.understand, desc: t.landing.understandDesc },
                { icon: Target, title: t.landing.recommend, desc: t.landing.recommendDesc },
                { icon: Pencil, title: t.landing.produce, desc: t.landing.produceDesc },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  className="p-3 sm:p-3.5 rounded-lg bg-muted/30 dark:bg-muted/15 border border-transparent text-center group hover:border-primary/15 transition-colors"
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

        <section className="px-4 py-20 sm:py-28 relative">
          <div className="absolute inset-0 bg-muted/30 dark:bg-[hsl(var(--card)/0.5)] border-y border-border/50 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-primary/3 dark:bg-primary/5 rounded-full blur-[200px]" />
          </div>

          <div className="max-w-6xl mx-auto w-full relative z-10">
            <SectionReveal>
              <div className="text-center mb-12 sm:mb-16">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/15 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4">
                  <Eye className="w-3 h-3" />
                  {t.landing.previewBadge}
                </span>
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3" data-testid="text-proof-title">
                  {t.landing.previewTitle}
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {t.landing.previewSubtitle}
                </p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

              <SectionReveal delay={0.1} className="lg:col-span-1">
                <Card className="border-border/60 bg-card shadow-lg dark:shadow-primary/5 h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t.landing.nicheInsights}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <SiTiktok className="w-3 h-3" style={{ color: isDark ? "rgba(178, 225, 232, 0.6)" : "rgba(0, 0, 0, 0.5)" }} />
                        <SiInstagram className="w-3 h-3" style={{ color: "rgba(214, 100, 144, 0.6)" }} />
                        <SiYoutube className="w-3 h-3" style={{ color: "rgba(220, 60, 60, 0.6)" }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: t.landing.topFormat, value: t.landing.topFormatValue, testid: "text-mock-format" },
                        { label: t.landing.avgDuration, value: "32s", testid: "text-mock-duration" },
                        { label: t.landing.hookStyle, value: t.landing.hookStyleValue, testid: "text-mock-hook-style" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 dark:bg-muted/20">
                          <span className="text-[11px] text-muted-foreground">{row.label}</span>
                          <span className="text-xs sm:text-sm font-semibold text-foreground" data-testid={row.testid}>{row.value}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 dark:bg-muted/20">
                        <span className="text-[11px] text-muted-foreground">{t.landing.aiScore}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <AnimatedBar width="78%" delay={0.3} />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-primary">78</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-1">
                      <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-primary/20 text-muted-foreground" data-testid="badge-real-data">
                        {t.landing.basedOnRealData}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>

              <SectionReveal delay={0.2} className="lg:col-span-1">
                <Card className="border-border/60 bg-card shadow-lg dark:shadow-primary/5 h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t.landing.winningHooks}</h3>
                    </div>
                    <div className="space-y-2">
                      {MOCK_HOOKS.map((hook, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                          className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 transition-colors group"
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
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t.landing.generatedBrief}</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t.landing.briefTitle}</span>
                        <p className="text-sm font-semibold text-foreground mt-0.5" data-testid="text-mock-brief-title">{MOCK_BRIEF.title}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t.landing.briefHook}</span>
                        <p className="text-sm text-foreground/80 italic mt-0.5" data-testid="text-mock-brief-hook">{MOCK_BRIEF.hook}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t.landing.briefStructure}</span>
                        <p className="text-sm text-foreground/80 mt-0.5">{MOCK_BRIEF.structure}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t.landing.briefCta}</span>
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
              <div className="flex justify-center mt-12 sm:mt-14">
                <Button
                  size="lg"
                  className="rounded-full px-8 h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-base shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 gap-2"
                  onClick={() => setLocation("/auth")}
                  data-testid="button-generate-first-brief"
                >
                  {t.landing.generateFirstBrief}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </SectionReveal>
          </div>
        </section>

        <section className="px-4 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto w-full">
            <SectionReveal>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-howitworks-title">
                  {t.landing.howItWorks}
                </h2>
                <p className="text-sm text-muted-foreground">{t.landing.howItWorksSubtitle}</p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-14">
              {[
                { step: "1", icon: Link2, title: t.landing.step1, desc: t.landing.step1Desc },
                { step: "2", icon: Search, title: t.landing.step2, desc: t.landing.step2Desc },
                { step: "3", icon: FileText, title: t.landing.step3, desc: t.landing.step3Desc },
              ].map((item, i) => (
                <SectionReveal key={i} delay={i * 0.12}>
                  <div className="flex flex-col items-center text-center" data-testid={`card-howitworks-${i}`}>
                    <div className="relative mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-7 h-7 text-primary" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-base font-display font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground max-w-[200px]">{item.desc}</p>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:py-18 bg-muted/20 dark:bg-muted/10 border-y border-border/50">
          <div className="max-w-3xl mx-auto w-full">
            <SectionReveal>
              <div className="text-center mb-6">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary mb-2">{t.landing.whyDifferent}</p>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground" data-testid="text-positioning-title">
                  {t.landing.notAnotherGenerator}
                </h2>
              </div>
            </SectionReveal>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {[
                { icon: Brain, title: t.landing.pos1 },
                { icon: TrendingUp, title: t.landing.pos2 },
                { icon: Sparkles, title: t.landing.pos3 },
                { icon: BarChart3, title: t.landing.pos4 },
              ].map((item, i) => (
                <SectionReveal key={i} delay={i * 0.06}>
                  <div
                    className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-lg bg-card border border-transparent hover:border-primary/15 transition-colors"
                    data-testid={`card-positioning-${i}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-display font-bold text-foreground">{item.title}</span>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <SectionReveal>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {t.landing.readyToAnalyze}
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                {t.landing.readyToAnalyzeSubtitle}
              </p>
              <Button
                size="lg"
                className="rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 gap-3"
                onClick={() => setLocation("/auth")}
                data-testid="button-bottom-cta"
              >
                {t.landing.ctaButton}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </SectionReveal>
          </div>
        </section>

        <footer className="px-4 py-12 border-t border-border/50">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
              <div className="col-span-2 md:col-span-1">
                <img src={isDark ? logoTransparent : logoLight} alt="Craflect" className="h-10 w-auto mb-3" />
                <p className="text-xs text-muted-foreground">{t.landing.footer}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3" data-testid="footer-product-heading">{t.footerLinks.product}</h4>
                <ul className="space-y-2">
                  <li><Link href="/pricing" className="text-sm text-muted-foreground hover-elevate" data-testid="footer-link-pricing">{t.footerLinks.pricing}</Link></li>
                  <li><Link href="/faq" className="text-sm text-muted-foreground hover-elevate" data-testid="footer-link-faq">{t.footerLinks.faq}</Link></li>
                  <li><Link href="/security" className="text-sm text-muted-foreground hover-elevate" data-testid="footer-link-security">{t.footerLinks.security}</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3" data-testid="footer-legal-heading">{t.footerLinks.legal}</h4>
                <ul className="space-y-2">
                  <li><Link href="/terms" className="text-sm text-muted-foreground hover-elevate" data-testid="footer-link-terms">{t.footerLinks.terms}</Link></li>
                  <li><Link href="/billing" className="text-sm text-muted-foreground hover-elevate" data-testid="footer-link-billing">{t.footerLinks.billing}</Link></li>
                  <li><Link href="/privacy" className="text-sm text-muted-foreground hover-elevate" data-testid="footer-link-privacy">{t.footerLinks.privacy}</Link></li>
                  <li><Link href="/cookies" className="text-sm text-muted-foreground hover-elevate" data-testid="footer-link-cookies">{t.footerLinks.cookies}</Link></li>
                  <li><Link href="/dpa" className="text-sm text-muted-foreground hover-elevate" data-testid="footer-link-dpa">{t.footerLinks.dpa}</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3" data-testid="footer-company-heading">{t.footerLinks.company}</h4>
                <ul className="space-y-2">
                  <li><a href="mailto:contact@craflect.com" className="text-sm text-muted-foreground hover-elevate" data-testid="footer-link-contact">{t.footerLinks.contact}</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-border/30 text-center">
              <p className="text-xs text-muted-foreground">
                {t.landing.copyright.replace("{year}", new Date().getFullYear().toString())}
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
