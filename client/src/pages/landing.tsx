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
  Eye,
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
  const { t, language } = useLanguage();
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/home");
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
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-primary px-2 py-1 rounded-lg transition-colors"
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
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-primary px-3 py-1.5 rounded-lg transition-colors"
            data-testid="nav-pricing"
          >
            {t.nav.pricing}
          </button>
          <LanguageSwitcher variant="icon" />
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-foreground transition-all border border-border hover:border-primary/30"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            data-testid="button-theme-toggle-landing"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setLocation("/auth?mode=login")}
            className="p-2.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-foreground transition-all border border-border hover:border-primary/30"
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
        <section className="relative flex flex-col items-center justify-center px-4 text-center pt-10 sm:pt-16 pb-20 sm:pb-28">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                background: isDark
                  ? "radial-gradient(circle at 50% 10%, rgba(124,92,255,0.18), transparent 60%)"
                  : "radial-gradient(circle at 50% 10%, rgba(124,92,255,0.10), transparent 60%)",
              }}
            />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 dark:bg-secondary/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3" />
            <div
              className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-4xl mx-auto relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 text-base font-semibold text-primary mb-8">
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

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
              {t.landing.subtitle}
            </p>

            <div className="flex flex-col items-center gap-2 mb-4" data-testid="platforms-bar">
              <div className="flex items-center gap-0">
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground/50">
                  <SiTiktok className="w-3.5 h-3.5" />
                  TikTok
                </span>
                <span className="mx-3 text-lg text-foreground/30 font-bold select-none">·</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground/50">
                  <SiInstagram className="w-3.5 h-3.5" />
                  Instagram Reels
                </span>
                <span className="mx-3 text-lg text-foreground/30 font-bold select-none">·</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground/50">
                  <SiYoutube className="w-3.5 h-3.5" />
                  YouTube Shorts
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground/70 font-medium mb-8" data-testid="text-proof-line">
              {t.landing.proofLine}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-0">
              <Button
                size="lg"
                className="rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg transition-all hover:-translate-y-1 gap-3"
                style={{ boxShadow: "0 0 40px rgba(124, 92, 255, 0.35), 0 10px 25px rgba(124, 92, 255, 0.25)" }}
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
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                data-testid="button-hero-secondary"
              >
                {t.landing.ctaSecondary}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[420px] mx-auto -mt-2"
            style={{ marginTop: "-8px" }}
          >
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-3 text-center" data-testid="text-preview-label">
              {t.landing.previewLabel}
            </p>
            <div
              className="rounded-2xl border border-border/50 dark:border-white/10 bg-card/90 dark:bg-card/80 backdrop-blur-md p-5 space-y-3"
              style={{
                boxShadow: isDark
                  ? "0 10px 40px rgba(0,0,0,0.3), 0 0 60px rgba(124,92,255,0.08)"
                  : "0 10px 30px rgba(0,0,0,0.08), 0 0 60px rgba(124,92,255,0.06)",
              }}
              data-testid="card-preview-idea"
            >
              <div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Hook</span>
                <p className="text-sm font-semibold text-foreground mt-0.5 leading-snug">"3 AI workflows that save 10 hours per week"</p>
              </div>
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Format</span>
                  <p className="text-xs font-medium text-foreground mt-0.5">Listicle</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Virality</span>
                  <p className="text-sm font-bold text-violet-500 mt-0.5">82</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1"><Eye className="w-3 h-3" /> Views</span>
                  <p className="text-xs font-medium text-foreground mt-0.5">300K – 900K</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
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

        {/* ═══ SEE IT. UNDERSTAND IT. USE IT. ═══ */}
        <section className="px-4 py-20 sm:py-28 relative">
          <div className="absolute inset-0 bg-muted/30 dark:bg-[hsl(var(--card)/0.5)] border-y border-border/50 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-primary/3 dark:bg-primary/5 rounded-full blur-[200px]" />
          </div>

          <div className="max-w-6xl mx-auto w-full relative z-10">
            <SectionReveal>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3" data-testid="text-inside-title">
                  {t.landing.insideTitle}
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {t.landing.insideSubtitle}
                </p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

              <SectionReveal delay={0.1} className="lg:col-span-1">
                <Card className="border-border/60 bg-card shadow-lg dark:shadow-primary/5 h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t.landing.card1Title}</h3>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: t.landing.card1Confidence, value: "78%", highlight: true },
                        { label: t.landing.card1Signal, value: "Strong" },
                        { label: t.landing.card1Videos, value: "642" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 dark:bg-muted/20">
                          <span className="text-[11px] text-muted-foreground">{row.label}</span>
                          <span className={`text-xs sm:text-sm font-semibold ${row.highlight ? "text-primary" : "text-foreground"}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border/40 pt-3 space-y-1.5">
                      {[
                        { label: t.landing.card1TopHook, value: "Question (42%)" },
                        { label: t.landing.card1TopFormat, value: "Talking Head (38%)" },
                        { label: t.landing.card1TopAngle, value: "Tactical (31%)" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between px-1">
                          <span className="text-[11px] text-muted-foreground">{row.label}</span>
                          <span className="text-xs font-medium text-foreground">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </SectionReveal>

              <SectionReveal delay={0.2} className="lg:col-span-1">
                <Card className="border-border/60 bg-card shadow-lg dark:shadow-primary/5 h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t.landing.card2Title}</h3>
                    </div>
                    <div className="space-y-2">
                      {[t.landing.card2Rec1, t.landing.card2Rec2, t.landing.card2Rec3].map((rec, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                          className="flex items-start gap-2.5 p-3 rounded-md bg-muted/40 dark:bg-muted/20"
                          data-testid={`text-rec-${i}`}
                        >
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-foreground leading-snug">{rec}</p>
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
                      <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t.landing.card3Title}</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t.landing.card3Hook}</span>
                        <p className="text-sm text-foreground/80 italic mt-0.5" data-testid="text-brief-hook">"I almost gave up on content creation until I discovered this one pattern..."</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t.landing.card3Flow}</span>
                        <p className="text-sm text-foreground/80 mt-0.5" data-testid="text-brief-flow">Hook → Personal story → Pattern reveal → CTA</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t.landing.card3Cta}</span>
                        <p className="text-sm text-foreground/80 italic mt-0.5" data-testid="text-brief-cta">Comment "PATTERN" and I'll send you the full breakdown.</p>
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

        {/* ═══ NOT ANOTHER AI CONTENT GENERATOR ═══ */}
        <section className="px-4 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto w-full">
            <SectionReveal>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3" data-testid="text-positioning-title">
                  {t.landing.notAnotherTitle}
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    {t.landing.notAnotherTitle2}
                  </span>
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
                className="rounded-full px-10 h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold text-lg transition-all hover:-translate-y-1 gap-3"
                style={{ boxShadow: "0 0 40px rgba(124, 92, 255, 0.35), 0 10px 25px rgba(124, 92, 255, 0.25)" }}
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
                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">{t.landing.footerProduct}</h4>
                <ul className="space-y-2.5">
                  <li><button onClick={() => setLocation("/pricing")} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-pricing">{t.nav.pricing}</button></li>
                  <li><button onClick={() => setLocation("/faq")} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-faq">FAQ</button></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">{t.landing.footerLegal}</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/legal/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-terms">{t.landing.footerTerms}</Link></li>
                  <li><Link href="/legal/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-privacy">{t.landing.footerPrivacy}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">{t.landing.footerAccount}</h4>
                <ul className="space-y-2.5">
                  <li><button onClick={() => setLocation("/auth?mode=login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-login">{t.auth.logIn}</button></li>
                  <li><button onClick={() => setLocation("/auth")} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-signup">{t.nav.signUp}</button></li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {t.landing.copyright.replace("{year}", new Date().getFullYear().toString())}
              </p>
              <div className="flex items-center gap-4">
                <LanguageSwitcher variant="icon" />
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                  data-testid="button-theme-toggle-footer"
                >
                  {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
