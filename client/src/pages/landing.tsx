import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  UserCircle2,
  Zap,
  TrendingUp,
  BarChart3,
  FileText,
  Layers,
  Search,
  Target,
  Brain,
  RefreshCw,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import logoLight from "@/assets/logo-light.png";
import logoTransparent from "@/assets/logo-transparent.png";

const WINNING_HOOKS = [
  "\"You've been doing this wrong your whole life…\"",
  "\"Nobody talks about this but…\"",
  "\"I tested this for 30 days — here's what happened\"",
];

const MOCK_BRIEF = {
  hook: "\"I almost gave up on content creation until I discovered this one pattern...\"",
  flow: "Hook → Personal story → Pattern reveal → CTA",
  cta: "Comment \"PATTERN\" and I'll send you the full breakdown.",
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
              {t.landing.ctaPrimary}
              <ArrowRight className="w-3.5 h-3.5" />
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

        {/* ═══ HERO ═══ */}
        <section className="relative flex flex-col items-center justify-center px-4 text-center pt-10 sm:pt-16 pb-12 sm:pb-16">
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
              <span data-testid="text-hero-badge">{t.landing.badge}</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight" data-testid="text-hero-headline">
              <span className="block">{t.landing.heroLine1}</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#8b5cf6] to-secondary">
                {t.landing.heroLine2}
              </span>
              <span className="block">{t.landing.heroLine3}</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
              {t.landing.subtitle}
            </p>

            <div className="flex flex-col items-center gap-2 mb-8" data-testid="platforms-bar">
              <span className="text-xs text-muted-foreground font-medium">{t.landing.builtForCreators}</span>
              <div className="flex items-center gap-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/75">
                  <SiTiktok className="w-4 h-4" />
                  TikTok
                </span>
                <span className="mx-3 text-lg text-foreground/50 font-bold select-none">·</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/75">
                  <SiInstagram className="w-4 h-4" />
                  Instagram Reels
                </span>
                <span className="mx-3 text-lg text-foreground/50 font-bold select-none">·</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/75">
                  <SiYoutube className="w-4 h-4" />
                  YouTube Shorts
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 gap-3"
                onClick={() => setLocation("/auth")}
                data-testid="button-hero-cta"
              >
                {t.landing.ctaPrimary}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <button
                onClick={() => {
                  const el = document.getElementById("section-clarity");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                data-testid="button-hero-secondary"
              >
                {t.landing.ctaSecondary}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* ═══ HOW CRAFLECT GIVES YOU CLARITY ═══ */}
        <section id="section-clarity" className="px-4 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto w-full">
            <SectionReveal>
              <div className="text-center mb-14 sm:mb-18">
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3" data-testid="text-clarity-title">
                  {t.landing.clarityTitle}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                  {t.landing.claritySubtitle}
                </p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-14">
              {[
                { step: "1", icon: Layers, title: t.landing.clarityStep1, desc: t.landing.clarityStep1Desc },
                { step: "2", icon: Search, title: t.landing.clarityStep2, desc: t.landing.clarityStep2Desc },
                { step: "3", icon: Target, title: t.landing.clarityStep3, desc: t.landing.clarityStep3Desc },
              ].map((item, i) => (
                <SectionReveal key={i} delay={i * 0.12}>
                  <div className="flex flex-col items-center text-center" data-testid={`card-clarity-${i}`}>
                    <div className="relative mb-6">
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
          </div>
        </section>

        {/* ═══ INSIDE YOUR NICHE INTELLIGENCE ═══ */}
        <section className="px-4 py-20 sm:py-28 relative">
          <div className="absolute inset-0 bg-muted/30 dark:bg-[hsl(var(--card)/0.5)] border-y border-border/50 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-primary/3 dark:bg-primary/5 rounded-full blur-[200px]" />
          </div>

          <div className="max-w-6xl mx-auto w-full relative z-10">
            <SectionReveal>
              <div className="text-center mb-12 sm:mb-16">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/15 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4">
                  <BarChart3 className="w-3 h-3" />
                  {t.landing.nicheInsights}
                </span>
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3" data-testid="text-inside-title">
                  {t.landing.insideTitle}
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {t.landing.insideSubtitle}
                </p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

              {/* Niche Insights Card */}
              <SectionReveal delay={0.1} className="lg:col-span-1">
                <Card className="border-border/60 bg-card shadow-lg dark:shadow-primary/5 h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t.landing.nicheInsights}</h3>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: t.landing.insightFormat, value: t.landing.insightFormatValue, testid: "text-insight-format" },
                        { label: t.landing.insightDuration, value: t.landing.insightDurationValue, testid: "text-insight-duration" },
                        { label: t.landing.insightHook, value: t.landing.insightHookValue, testid: "text-insight-hook" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 dark:bg-muted/20">
                          <span className="text-[11px] text-muted-foreground">{row.label}</span>
                          <span className="text-xs sm:text-sm font-semibold text-foreground" data-testid={row.testid}>{row.value}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 dark:bg-muted/20">
                        <span className="text-[11px] text-muted-foreground">{t.landing.insightConfidence}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <AnimatedBar width="78%" delay={0.3} />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-primary" data-testid="text-insight-confidence">78%</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-semibold text-foreground" data-testid="badge-analyzed-videos">
                        {t.landing.insightVideos}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>

              {/* Winning Hooks Card */}
              <SectionReveal delay={0.2} className="lg:col-span-1">
                <Card className="border-border/60 bg-card shadow-lg dark:shadow-primary/5 h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t.landing.winningHooks}</h3>
                    </div>
                    <div className="space-y-2">
                      {WINNING_HOOKS.map((hook, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                          className="flex items-start gap-2.5 p-3 rounded-md bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 transition-colors group"
                          data-testid={`text-hook-${i}`}
                        >
                          <span className="w-5 h-5 rounded-full bg-primary/10 group-hover:bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 transition-colors">
                            {i + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-foreground leading-snug italic">{hook}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>

              {/* Execution Brief Card */}
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
                        <p className="text-sm text-foreground/80 italic mt-0.5" data-testid="text-brief-hook">{MOCK_BRIEF.hook}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t.landing.briefHook}</span>
                        <p className="text-sm text-foreground/80 mt-0.5" data-testid="text-brief-flow">{MOCK_BRIEF.flow}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t.landing.briefCta}</span>
                        <p className="text-sm text-foreground/80 italic mt-0.5" data-testid="text-brief-cta">{MOCK_BRIEF.cta}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {["TikTok", "Reels", "Shorts"].map((p) => (
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
                  data-testid="button-generate-brief"
                >
                  {t.landing.generateBrief}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ═══ NOT ANOTHER AI CONTENT TOOL ═══ */}
        <section className="px-4 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto w-full">
            <SectionReveal>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3" data-testid="text-positioning-title">
                  {t.landing.notAnotherTitle}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
                  {t.landing.notAnotherSubtitle}
                </p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {[
                { icon: Brain, title: t.landing.pillar1, desc: t.landing.pillar1Desc },
                { icon: TrendingUp, title: t.landing.pillar2, desc: t.landing.pillar2Desc },
                { icon: RefreshCw, title: t.landing.pillar3, desc: t.landing.pillar3Desc },
                { icon: Video, title: t.landing.pillar4, desc: t.landing.pillar4Desc },
              ].map((item, i) => (
                <SectionReveal key={i} delay={i * 0.08}>
                  <div
                    className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border/60 hover:border-primary/20 transition-colors"
                    data-testid={`card-pillar-${i}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-bold text-foreground mb-1">{item.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA ═══ */}
        <section className="px-4 py-20 sm:py-24 relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 dark:bg-primary/8 rounded-full blur-[150px]" />
          </div>
          <div className="max-w-2xl mx-auto text-center relative z-10">
            <SectionReveal>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-final-title">
                {t.landing.finalTitle}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-md mx-auto">
                {t.landing.finalSubtitle}
              </p>
              <Button
                size="lg"
                className="rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 gap-3"
                onClick={() => setLocation("/auth")}
                data-testid="button-final-cta"
              >
                {t.landing.finalCta}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </SectionReveal>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
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
