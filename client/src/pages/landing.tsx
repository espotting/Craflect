import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  UserCircle2,
  Zap,
  TrendingUp,
  BarChart3,
  FileText,
  Target,
  Video,
  Compass,
  Play,
  Flame,
  Check,
  CheckCircle2,
  Lightbulb,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import logoTransparent from "@assets/Logo_PurpWhite_HD_wBG_1775302281780.png";

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
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [yearly, setYearly] = useState(true);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated && (user as any)?.onboardingCompleted) {
      setLocation("/home");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isLoading) return null;
  if (isAuthenticated && (user as any)?.onboardingCompleted) return null;

  const handleGetStarted = () => setLocation("/waitlist");
  const handleSignIn = () => setLocation("/signin");
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };
  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  const plans = [
    {
      name: t.landing.pricingFreeName,
      price: 0,
      yearlyPrice: undefined,
      credits: 30,
      videos: "~10",
      rollover: 0,
      description: t.landing.pricingFreeDesc,
      features: t.landing.pricingFreeFeatures.split(","),
      cta: t.landing.pricingFreeCta,
      highlighted: false,
      badge: undefined as string | undefined,
    },
    {
      name: t.landing.pricingCreatorName,
      price: 24,
      yearlyPrice: 19,
      credits: 250,
      videos: "~80",
      rollover: 500,
      description: t.landing.pricingCreatorDesc,
      features: t.landing.pricingCreatorFeatures.split(","),
      cta: t.landing.pricingCreatorCta,
      highlighted: true,
      badge: t.landing.pricingCreatorBadge,
    },
    {
      name: t.landing.pricingProName,
      price: 109,
      yearlyPrice: 99,
      credits: 1500,
      videos: "~500",
      rollover: 3000,
      description: t.landing.pricingProDesc,
      features: t.landing.pricingProFeatures.split(","),
      cta: t.landing.pricingProCta,
      highlighted: false,
      badge: undefined as string | undefined,
    },
  ];

  const faqs = [
    { q: t.landing.faq1Q, a: t.landing.faq1A },
    { q: t.landing.faq2Q, a: t.landing.faq2A },
    { q: t.landing.faq3Q, a: t.landing.faq3A },
    { q: t.landing.faq4Q, a: t.landing.faq4A },
  ];

  const trendingVideos = [
    { score: 94, hook: "I tested every AI writing tool..." },
    { score: 88, hook: "The one mistake killing..." },
    { score: 91, hook: "Stop doing this in your hooks..." },
    { score: 96, hook: "This format got me 1M views..." },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">

      {/* ═══ NAVBAR ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-slate-950/90 backdrop-blur-xl border-b border-slate-800" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="#" className="flex items-center" data-testid="logo-landing">
              <img src={logoTransparent} alt="Craflect" className="h-10 w-auto" />
            </a>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={scrollToPricing}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                data-testid="nav-pricing"
              >
                {t.nav.pricing}
              </button>

              <div className="flex items-center gap-1.5">
                <LanguageSwitcher variant="icon" className="!bg-slate-800/80 !border-slate-700 !text-slate-400 hover:!bg-slate-700 hover:!border-slate-600 hover:!text-white" />

                <button
                  onClick={handleSignIn}
                  className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center hover:bg-slate-700 hover:border-slate-600 transition-colors group"
                  data-testid="button-login-nav"
                >
                  <UserCircle2 className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </button>
              </div>

              <Button
                onClick={handleGetStarted}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 h-10"
                data-testid="button-signin-nav"
              >
                {t.landing.ctaHeader}
              </Button>
            </div>

            <button
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-800 pt-4">
              <div className="flex flex-col gap-4">
                <button
                  onClick={scrollToPricing}
                  className="text-slate-400 hover:text-white transition-colors text-sm font-medium text-left"
                >
                  {t.nav.pricing}
                </button>
                <Separator className="bg-slate-800" />
                <Button
                  onClick={handleGetStarted}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-full"
                >
                  {t.landing.ctaHeader}
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main>

        {/* ═══ HERO ═══ */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium" data-testid="text-hero-badge">{t.landing.badge}</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight" data-testid="text-hero-headline">
                <span className="block">{t.landing.heroLine1}</span>
                <span className="block bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {t.landing.heroLine2}
                </span>
                <span className="block">{t.landing.heroLine3}</span>
              </h1>

              <p className="text-xl text-slate-400 mb-6 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
                {t.landing.subtitle}
              </p>

              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-4" data-testid="platforms-row">
                <SiTiktok className="w-4 h-4" />
                <span>TikTok</span>
                <span className="mx-1">·</span>
                <SiInstagram className="w-4 h-4" />
                <span>Instagram Reels</span>
                <span className="mx-1">·</span>
                <SiYoutube className="w-4 h-4" />
                <span>YouTube Shorts</span>
              </div>

              <p className="text-slate-500 text-sm mb-8" data-testid="text-proof-line">
                {t.landing.proofLine}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-14 text-lg rounded-full shadow-lg shadow-purple-500/25"
                  data-testid="button-hero-cta"
                >
                  {t.landing.ctaPrimary}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={scrollToHowItWorks}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 h-14 text-lg rounded-full"
                  data-testid="button-hero-secondary"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {t.landing.ctaSecondary}
                </Button>
              </div>
            </motion.div>

            {/* Dashboard Preview */}
            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none" />
              <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-2 shadow-2xl shadow-purple-500/10">
                <div className="bg-slate-950 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <div className="flex-1 text-center text-xs text-slate-500">{t.landing.dashboardPreviewUrl}</div>
                  </div>

                  <div className="p-6">
                    <div className="flex gap-6">
                      <div className="w-48 space-y-1 hidden md:block">
                        <div className="flex items-center gap-3 px-3 py-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                          <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-purple-300 text-sm">Home</span>
                        </div>
                        {["Opportunities", "Create", "Workspace", "Insights"].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2">
                            <div className="w-5 h-5 rounded bg-slate-800" />
                            <span className="text-slate-500 text-sm">{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="bg-gradient-to-br from-purple-900/50 via-slate-900/50 to-slate-900/50 rounded-xl p-4 border border-purple-500/30 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
                          <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                                <Flame className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-purple-300 text-xs font-medium uppercase tracking-wider">{t.landing.heroViralPlay}</span>
                            </div>
                            <p className="text-white font-semibold text-lg mb-2">
                              {t.landing.heroViralHook}
                            </p>
                            <div className="flex gap-4 mb-3 flex-wrap">
                              <span className="text-slate-400 text-xs">{t.landing.heroViralFormat}</span>
                              <span className="text-green-400 text-xs">{t.landing.heroViralViews}</span>
                              <span className="text-purple-400 text-xs">{t.landing.heroViralConfidence}</span>
                            </div>
                            <div className="flex gap-2">
                              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                {t.landing.heroCreateBtn}
                              </button>
                              <button className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-lg">
                                {t.landing.heroSeeSimilar}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="hidden sm:block">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-orange-400" />
                            <span className="text-white text-sm font-medium">{t.landing.heroTrending}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            {trendingVideos.map((video, i) => (
                              <div key={i} className="relative aspect-[9/16] rounded-lg overflow-hidden group cursor-pointer">
                                <div className={`absolute inset-0 bg-gradient-to-br ${
                                  i === 0 ? "from-violet-600 via-purple-600 to-fuchsia-600" :
                                  i === 1 ? "from-blue-600 via-cyan-600 to-teal-600" :
                                  i === 2 ? "from-orange-600 via-amber-600 to-yellow-600" :
                                  "from-rose-600 via-pink-600 to-purple-600"
                                }`} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute top-2 right-2">
                                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                    video.score >= 90 ? "bg-red-500/20 text-red-400" :
                                    video.score >= 80 ? "bg-orange-500/20 text-orange-400" :
                                    "bg-yellow-500/20 text-yellow-400"
                                  }`}>
                                    <Flame className="w-2 h-2 inline mr-0.5" />
                                    {video.score}
                                  </span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                  <p className="text-white text-[10px] line-clamp-2">{video.hook}</p>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                                  <button className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg">
                                    {t.landing.heroCreateSimilar}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section id="how-it-works" className="py-24 relative">
          <div className="max-w-6xl mx-auto px-6">
            <SectionReveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4" data-testid="text-clarity-title">{t.landing.clarityTitle}</h2>
                <p className="text-slate-400 text-lg">{t.landing.claritySubtitle}</p>
              </div>
            </SectionReveal>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Compass, title: t.landing.clarityStep1, desc: t.landing.clarityStep1Desc },
                { icon: FileText, title: t.landing.clarityStep2, desc: t.landing.clarityStep2Desc },
                { icon: Video, title: t.landing.clarityStep3, desc: t.landing.clarityStep3Desc },
              ].map((step, i) => (
                <SectionReveal key={i} delay={i * 0.12}>
                  <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800 hover:border-purple-500/30 transition-all group" data-testid={`card-clarity-${i}`}>
                    <div className="relative mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <step.icon className="w-8 h-8 text-purple-400" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                    <p className="text-slate-400">{step.desc}</p>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SEE IT. UNDERSTAND IT. USE IT. ═══ */}
        <section className="py-24 relative">
          <div className="max-w-6xl mx-auto px-6">
            <SectionReveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" data-testid="text-inside-title">
                  {t.landing.insideTitle}
                </h2>
                <p className="text-slate-400 text-lg">{t.landing.insideSubtitle}</p>
              </div>
            </SectionReveal>

            <div className="grid md:grid-cols-3 gap-6 mb-12 items-stretch">
              <SectionReveal delay={0.1} className="flex">
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20 transition-all flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">{t.landing.card1Title}</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{t.landing.card1Confidence}</span>
                      <span className="text-purple-400 font-bold">87%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{t.landing.card1Signal}</span>
                      <span className="text-white font-medium">Strong</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{t.landing.card1Videos}</span>
                      <span className="text-white font-medium">2,847</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{t.landing.card1TopHook}</span>
                      <span className="text-white font-medium">Question (42%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{t.landing.card1TopFormat}</span>
                      <span className="text-white font-medium">Listicle (38%)</span>
                    </div>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.2} className="flex">
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20 transition-all flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-6">
                    <Target className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">{t.landing.card2Title}</span>
                  </div>
                  <div className="space-y-4">
                    {[t.landing.card2Rec1, t.landing.card2Rec2, t.landing.card2Rec3, t.landing.card2Rec4].map((tip, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-purple-400 text-xs font-bold">{i + 1}</span>
                        </div>
                        <p className="text-slate-300 text-sm">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.3} className="flex">
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20 transition-all flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">{t.landing.card3Title}</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-slate-500 text-xs uppercase tracking-wider">{t.landing.card3Hook}</span>
                      <p className="text-white text-sm mt-1 italic" data-testid="text-brief-hook">
                        "I almost gave up on content creation until I discovered this one pattern..."
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase tracking-wider">{t.landing.card3Flow}</span>
                      <p className="text-slate-300 text-sm mt-1" data-testid="text-brief-flow">
                        Hook → Personal story → Pattern reveal → CTA
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase tracking-wider">{t.landing.card3Cta}</span>
                      <p className="text-slate-300 text-sm mt-1" data-testid="text-brief-cta">
                        Comment "PATTERN" and I'll send you the full breakdown.
                      </p>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            </div>

            <SectionReveal delay={0.4}>
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-14 text-lg rounded-full"
                  data-testid="button-generate-brief"
                >
                  {t.landing.generateBrief}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ═══ NOT ANOTHER AI CONTENT GENERATOR ═══ */}
        <section className="py-24 relative">
          <div className="max-w-6xl mx-auto px-6">
            <SectionReveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-1" data-testid="text-positioning-title">
                  {t.landing.notAnotherTitle}
                </h2>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-4">
                  {t.landing.notAnotherTitle2}
                </p>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                  {t.landing.notAnotherSubtitle}
                </p>
              </div>
            </SectionReveal>

            <div className="grid md:grid-cols-2 gap-6 items-stretch">
              {[
                { icon: BarChart3, title: t.landing.pillar1, desc: t.landing.pillar1Desc },
                { icon: Target, title: t.landing.pillar2, desc: t.landing.pillar2Desc },
                { icon: TrendingUp, title: t.landing.pillar3, desc: t.landing.pillar3Desc },
                { icon: Video, title: t.landing.pillar4, desc: t.landing.pillar4Desc },
              ].map((item, i) => (
                <SectionReveal key={i} delay={i * 0.08} className="flex">
                  <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20 transition-all group flex flex-col flex-1" data-testid={`card-pillar-${i}`}>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <item.icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400">{item.desc}</p>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ PRICING ═══ */}
        <section id="pricing" className="py-24 relative">
          <div className="max-w-6xl mx-auto px-6">
            <SectionReveal>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">{t.landing.pricingTitle}</h2>
                <p className="text-slate-400 text-lg mb-8">{t.landing.pricingSubtitle}</p>

                <div className="inline-flex items-center gap-4 p-1 bg-slate-900 rounded-full border border-slate-800">
                  <button
                    onClick={() => setYearly(false)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      !yearly ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                    data-testid="toggle-monthly"
                  >
                    {t.landing.pricingMonthly}
                  </button>
                  <button
                    onClick={() => setYearly(true)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                      yearly ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                    data-testid="toggle-yearly"
                  >
                    {t.landing.pricingYearly}
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                      {t.landing.pricingSave}
                    </span>
                  </button>
                </div>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="flex items-center justify-center gap-4 mb-12 flex-wrap">
                {[t.landing.pricingFreeTrial, t.landing.pricingNoCard, t.landing.pricingCancelAnytime].map((badge, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-400 text-sm">{badge}</span>
                  </div>
                ))}
              </div>
            </SectionReveal>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
                <SectionReveal key={index} delay={0.1 + index * 0.1}>
                  <div className={`relative rounded-2xl p-6 border h-full ${
                    plan.highlighted
                      ? "bg-slate-900 border-purple-500/50"
                      : "bg-slate-900/50 border-slate-800"
                  }`}>
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                      <p className="text-slate-400 text-sm">{plan.description}</p>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">
                          ${yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price}
                        </span>
                        <span className="text-slate-400">{t.landing.pricingPerMonth}</span>
                      </div>
                      {yearly && plan.yearlyPrice && (
                        <p className="text-slate-500 text-sm mt-1">
                          {t.landing.pricingBilledAnnually.replace("${amount}", String(plan.yearlyPrice * 12))}
                        </p>
                      )}
                    </div>

                    <div className="mb-6 p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-white font-medium">{plan.credits}</span>
                        <span className="text-slate-400">{t.landing.pricingCreditsPerMonth}</span>
                      </div>
                      <p className="text-green-400 text-sm font-medium">
                        {t.landing.pricingVideosPerMonth.replace("{count}", plan.videos)}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {t.landing.pricingMaxRollover.replace("{count}", String(plan.rollover))}
                      </p>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={handleGetStarted}
                      className={`w-full ${
                        plan.highlighted
                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-white"
                      }`}
                      data-testid={`button-plan-${plan.name.toLowerCase()}`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.4}>
              <div className="mt-12 max-w-2xl mx-auto">
                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">{t.landing.pricingCreditsTitle}</h4>
                      <p className="text-slate-400 text-sm">{t.landing.pricingCreditsDesc}</p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section id="faq" className="py-24 relative">
          <div className="max-w-3xl mx-auto px-6">
            <SectionReveal>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">{t.landing.faqTitle}</h2>
                <p className="text-slate-400">{t.landing.faqSubtitle}</p>
              </div>
            </SectionReveal>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <SectionReveal key={index} delay={index * 0.05}>
                  <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                    <button
                      onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                      className="w-full flex items-center justify-between p-5 text-left"
                      data-testid={`faq-toggle-${index}`}
                    >
                      <span className="text-white font-medium">{faq.q}</span>
                      <div className={`w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center transition-transform ${
                        faqOpen === index ? "rotate-180" : ""
                      }`}>
                        <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                      </div>
                    </button>
                    {faqOpen === index && (
                      <div className="px-5 pb-5">
                        <p className="text-slate-400">{faq.a}</p>
                      </div>
                    )}
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA ═══ */}
        <section className="py-24 relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
            <SectionReveal>
              <h2 className="text-4xl font-bold text-white mb-4" data-testid="text-final-title">{t.landing.finalTitle}</h2>
              <p className="text-slate-400 text-lg mb-8">{t.landing.finalSubtitle}</p>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-14 text-lg rounded-full shadow-lg shadow-purple-500/25"
                data-testid="button-final-cta"
              >
                {t.landing.finalCta}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-slate-500 text-sm mt-4">{t.landing.finalProof}</p>
            </SectionReveal>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer id="footer" className="border-t border-slate-800 py-16" data-testid="footer">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <img src={logoTransparent} alt="Craflect" className="h-12 w-auto" />
              </div>
              <p className="text-slate-400 text-sm mb-4">{t.landing.footer}</p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors" data-testid="link-social-twitter">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors" data-testid="link-social-linkedin">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4" data-testid="text-footer-product">{t.landing.footerProduct}</h4>
              <ul className="space-y-2">
                <li><a href="/#pricing" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-pricing">{t.nav.pricing}</a></li>
                <li><a href="/#faq" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-faq">{t.landing.footerFaq}</a></li>
                <li><Link href="/security" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-security">{t.landing.footerSecurity}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4" data-testid="text-footer-legal">{t.landing.footerLegal}</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-terms">{t.landing.footerTerms}</Link></li>
                <li><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-privacy">{t.landing.footerPrivacy}</Link></li>
                <li><Link href="/cookies" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-cookies">{t.landing.footerCookies}</Link></li>
                <li><Link href="/dpa" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-dpa">{t.landing.footerDpa}</Link></li>
                <li><Link href="/billing" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-billing">{t.landing.footerBilling}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4" data-testid="text-footer-company">{t.landing.footerCompany}</h4>
              <ul className="space-y-2">
                <li><Link href="/contact" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-contact">{t.landing.footerContact}</Link></li>
              </ul>
            </div>
          </div>

          <Separator className="bg-slate-800 mb-8" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm" data-testid="text-copyright">
              {t.landing.copyright.replace("{year}", new Date().getFullYear().toString())}
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-slate-500 hover:text-white transition-colors text-sm">
                {t.landing.footerPrivacy}
              </Link>
              <Link href="/terms" className="text-slate-500 hover:text-white transition-colors text-sm">
                {t.landing.footerTerms}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
