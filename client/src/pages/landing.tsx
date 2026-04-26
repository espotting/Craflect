import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  UserCircle2,
  TrendingUp,
  BarChart3,
  FileText,
  Target,
  Video,
  Compass,
  Play,
  Check,
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
  const handleSignIn = () => setLocation("/welcome");
  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };
  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  const faqs = [
    {
      q: "Is Craflect free?",
      a: "Yes — during beta, Craflect is completely free. Founding members get full access with no credit card required.",
    },
    {
      q: "Which platforms does Craflect cover?",
      a: "TikTok is live. Instagram Reels and YouTube Shorts are coming soon.",
    },
    {
      q: "How often are patterns updated?",
      a: "The engine scans thousands of videos every 72 hours to surface fresh signals.",
    },
    {
      q: "Do I need to create an account?",
      a: "You apply via the waitlist. Once approved, you'll get immediate access with no setup required.",
    },
    {
      q: "What niches are supported?",
      a: "We currently track 20 niches — from Finance and AI Tools to Fitness, Cooking, and more. You pick yours during onboarding.",
    },
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
                <span className="text-purple-300 text-sm font-medium" data-testid="text-hero-badge">🚀 Beta launch — Limited spots available</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight" data-testid="text-hero-headline">
                <span className="block">Stop guessing.</span>
                <span className="block bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Start knowing.
                </span>
                <span className="block">Before you post.</span>
              </h1>

              <p className="text-xl text-slate-400 mb-6 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
                Craflect detects viral patterns across TikTok, Reels and Shorts
                before they peak — so you create with signal, not luck.
              </p>

              <div className="flex items-center justify-center gap-3 flex-wrap text-slate-500 text-sm mb-4" data-testid="platforms-row">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
                  <SiTiktok className="w-4 h-4 text-white" />
                  <span className="text-white font-medium text-sm">TikTok</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-bold">Live</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800/50">
                  <SiInstagram className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-500 text-sm">Reels</span>
                  <span className="text-slate-600 text-xs">· Soon</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800/50">
                  <SiYoutube className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-500 text-sm">Shorts</span>
                  <span className="text-slate-600 text-xs">· Soon</span>
                </div>
              </div>

              <p className="text-slate-500 text-sm mb-8" data-testid="text-proof-line">
                Tens of thousands of videos analyzed · 20 niches tracked · Signals refreshed every 72 hours
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

            {/* Dashboard Preview — vrai design Craflect */}
            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none" style={{ top: '60%' }} />
              <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-2 shadow-2xl shadow-purple-500/10">
                <div className="bg-[#08080f] rounded-xl overflow-hidden">

                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0c0c17] border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/40" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                      <div className="w-3 h-3 rounded-full bg-green-500/40" />
                    </div>
                    <div className="flex-1 text-center text-xs text-slate-600">app.craflect.com</div>
                  </div>

                  {/* App shell */}
                  <div className="flex h-[340px]">

                    {/* Sidebar 48px */}
                    <div className="w-12 bg-[#0c0c17] border-r border-white/5 flex flex-col items-center py-3 gap-2 flex-shrink-0">
                      <div className="w-7 h-7 rounded-lg mb-2" style={{background: 'linear-gradient(135deg,#7C5CFF,#c026d3)'}} />
                      {[true, false, false, false, false].map((active, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: active ? 'rgba(124,92,255,0.2)' : 'transparent'}}>
                          <div className="w-3.5 h-3.5 rounded-sm" style={{background: active ? '#a78bfa' : 'rgba(255,255,255,0.15)'}} />
                        </div>
                      ))}
                    </div>

                    {/* Main */}
                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                      {/* Topbar */}
                      <div className="h-10 border-b border-white/5 flex items-center px-4 gap-3 flex-shrink-0">
                        <span className="text-xs text-white/25">Today's <span className="text-white/60 font-medium">Intelligence</span></span>
                        <div className="flex-1" />
                        <div className="flex gap-0.5 bg-white/5 border border-white/8 rounded-md p-0.5">
                          {['TikTok','Reels','Shorts'].map((p,i) => (
                            <div key={i} className="px-2 py-1 rounded text-[9px] font-semibold" style={{background: i===0 ? 'rgba(124,92,255,0.25)' : 'transparent', color: i===0 ? '#a78bfa' : 'rgba(255,255,255,0.25)'}}>
                              {p}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-amber-400" style={{background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.15)'}}>
                          🔥 7
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 overflow-hidden">

                        {/* Feed */}
                        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                          {/* Signal hero */}
                          <div className="p-3 border-b border-white/5 flex-shrink-0" style={{background:'linear-gradient(135deg,#080614,#130826,#091420)'}}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold text-emerald-400" style={{background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)'}}>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Strong · Finance
                              </div>
                            </div>
                            <div className="text-sm font-bold text-white mb-1" style={{letterSpacing:'-0.02em'}}>
                              "The #1 mistake with <span style={{color:'#a78bfa',background:'rgba(124,92,255,0.15)',padding:'0 3px',borderRadius:3}}>[savings]</span>"
                            </div>
                            <div className="text-[9px] text-white/35 mb-2 border-l border-purple-500/30 pl-2">
                              Mistake framing triggers loss aversion. 2.3× above Finance avg.
                            </div>
                            <div className="flex gap-2 text-[9px] text-white/40 mb-2">
                              <span className="font-bold text-white/70">1.2M–4M</span> predicted views &nbsp;·&nbsp; <span className="font-bold text-white/70">94</span> videos &nbsp;·&nbsp; <span className="font-bold text-white/70">72h</span> window
                            </div>
                            <div className="flex gap-2">
                              <div className="px-3 py-1.5 rounded-md text-[10px] font-bold text-white" style={{background:'linear-gradient(90deg,#7C5CFF,#c026d3)'}}>Create this video →</div>
                              <div className="px-3 py-1.5 rounded-md text-[10px] text-white/30" style={{border:'1px solid rgba(255,255,255,0.08)'}}>Explore</div>
                            </div>
                          </div>

                          {/* Pattern cards row */}
                          <div className="p-3 overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5 text-[8px] font-bold text-white/25 uppercase tracking-wider">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />Finance
                              </div>
                              <span className="text-[8px] text-white/20">See all →</span>
                            </div>
                            <div className="flex gap-2 overflow-hidden">
                              {[
                                {sig:'Strong',sc:'s',hook:'#1 mistake with [savings]',v:'3.4M',e:'4.2%',vel:'+180%',vir:'87'},
                                {sig:'Building',sc:'b',hook:'Nobody tells you [this]',v:'1.8M',e:'3.8%',vel:'+95%',vir:'74'},
                              ].map((c,i) => (
                                <div key={i} className="flex-shrink-0 w-36 rounded-lg overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.08)',background:'#0f1118'}}>
                                  <div className="p-2">
                                    <div className="flex items-center gap-1 mb-1.5" style={{display:'inline-flex',padding:'1px 6px',borderRadius:20,background:c.sc==='s'?'rgba(34,197,94,0.12)':'rgba(245,158,11,0.12)',border:`1px solid ${c.sc==='s'?'rgba(34,197,94,0.3)':'rgba(245,158,11,0.3)'}`}}>
                                      <div className="w-1.5 h-1.5 rounded-full" style={{background:c.sc==='s'?'#22c55e':'#f59e0b'}} />
                                      <span className="text-[7px] font-bold" style={{color:c.sc==='s'?'#22c55e':'#f59e0b'}}>{c.sig}</span>
                                    </div>
                                    <div className="text-[9px] font-bold text-white mb-1">"{c.hook}"</div>
                                  </div>
                                  <div className="px-2 pb-2" style={{background:'#0b0b15'}}>
                                    {([['Views',c.v,'#a78bfa',85],['Eng',c.e,'#22c55e',65],['Vel',c.vel,'#f59e0b',50],['Vir',c.vir+'/100','#f472b6',parseInt(c.vir)]] as [string,string,string,number][]).map(([l,v,col,w])=>(
                                      <div key={l} className="mb-1">
                                        <div className="flex justify-between mb-0.5">
                                          <span className="text-[7px] text-white/20 uppercase">{l}</span>
                                          <span className="text-[8px] font-bold" style={{color:col}}>{v}</span>
                                        </div>
                                        <div className="h-0.5 rounded-full" style={{background:'rgba(255,255,255,0.06)'}}>
                                          <div className="h-full rounded-full" style={{width:`${w}%`,background:col}} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="py-1 text-center text-[8px] font-semibold text-purple-400" style={{background:'rgba(124,92,255,0.06)',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                                    Create →
                                  </div>
                                  <div className="h-0.5" style={{background:'linear-gradient(90deg,#7C5CFF,#c026d3)'}} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right panel */}
                        <div className="w-36 border-l border-white/5 flex-shrink-0 p-2.5" style={{background:'#09090f'}}>
                          <div className="text-[8px] font-bold text-white/25 uppercase tracking-wider mb-2">Today's Playbook</div>
                          {([['✓','Check signal',true],['✓','Pick a pattern',true],['○','Create video',false],['○','Track results',false]] as [string,string,boolean][]).map(([,t2,d])=>(
                            <div key={t2} className="flex items-center gap-1.5 py-1 border-b border-white/4">
                              <div className="w-3 h-3 rounded flex items-center justify-center text-[7px]" style={{background:d?'rgba(34,197,94,0.15)':'transparent',border:`1px solid ${d?'rgba(34,197,94,0.35)':'rgba(255,255,255,0.15)'}`,color:'#22c55e'}}>
                                {d?'✓':''}
                              </div>
                              <span className="text-[9px]" style={{color:d?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.55)',textDecoration:d?'line-through':'none'}}>{t2}</span>
                            </div>
                          ))}
                          <div className="text-[8px] font-bold text-white/25 uppercase tracking-wider mb-2 mt-3">Streak</div>
                          <div className="flex gap-0.5 mb-1">
                            {['M','T','W','T','F','S','S'].map((d,i)=>(
                              <div key={i} className="w-4 h-4 rounded text-[7px] font-bold flex items-center justify-center" style={{background:i<6?'rgba(124,92,255,0.2)':'rgba(124,92,255,0.45)',color:i<6?'#a78bfa':'#fff'}}>
                                {d}
                              </div>
                            ))}
                          </div>
                          <div className="text-[9px] text-amber-400 font-bold">7 days 🏆</div>
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

            <div className="grid md:grid-cols-3 gap-8 items-stretch">
              {[
                {
                  icon: Compass,
                  title: "The Engine detects a signal",
                  desc: "Every 72 hours, Craflect scans thousands of viral videos and identifies patterns gaining momentum in your niche — before they peak.",
                },
                {
                  icon: FileText,
                  title: "You see the intelligence",
                  desc: "Hook type, why it works, predicted views, virality score. Not a catalog of old content — a live signal of what's working right now.",
                },
                {
                  icon: Video,
                  title: "You create with precision",
                  desc: "The Studio generates a ready-to-shoot brief using the pattern. You post. You track. The engine learns from your results.",
                },
              ].map((step, i) => (
                <SectionReveal key={i} delay={i * 0.12} className="flex">
                  <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800 hover:border-purple-500/30 transition-all group flex flex-col flex-1" data-testid={`card-clarity-${i}`}>
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
              {/* Block 1 — Live Signal */}
              <SectionReveal delay={0.1} className="flex">
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20 transition-all flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">Live Signal</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-400" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Strong · Finance
                    </div>
                  </div>
                  <p className="text-white font-semibold text-sm mb-2">
                    "The #1 mistake with{" "}
                    <span className="text-purple-300" style={{ background: 'rgba(124,92,255,0.15)', padding: '0 4px', borderRadius: 3 }}>[savings]</span>
                    "
                  </p>
                  <p className="text-slate-500 text-xs mb-4 border-l-2 border-purple-500/30 pl-3">
                    Mistake framing triggers loss aversion. 2.3× above Finance avg.
                  </p>
                  <div className="flex gap-3 text-xs text-slate-500 mt-auto">
                    <span><span className="text-white font-semibold">1.2M–4M</span> views</span>
                    <span><span className="text-white font-semibold">94</span> videos</span>
                    <span>Virality <span className="text-white font-semibold">87/100</span></span>
                  </div>
                </div>
              </SectionReveal>

              {/* Block 2 — Hook Intelligence */}
              <SectionReveal delay={0.2} className="flex">
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20 transition-all flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">Hook Intelligence</span>
                  </div>
                  <div className="space-y-3 flex-1">
                    {([
                      ["Hook type", "Question", 42],
                      ["Format", "Listicle", 38],
                      ["Avg views", "2.4M", 72],
                      ["Engagement", "4.2%", 65],
                    ] as [string, string, number][]).map(([label, value, pct]) => (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-500 text-xs">{label}</span>
                          <span className="text-white text-xs font-semibold">{value}</span>
                        </div>
                        <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionReveal>

              {/* Block 3 — Your Brief */}
              <SectionReveal delay={0.3} className="flex">
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20 transition-all flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">Your Brief</span>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <span className="text-slate-500 text-xs uppercase tracking-wider">Hook template</span>
                      <p className="text-white text-sm mt-2 leading-relaxed" data-testid="text-brief-hook">
                        "The #1{" "}
                        <span className="text-purple-300 font-semibold" style={{ background: 'rgba(124,92,255,0.15)', padding: '0 4px', borderRadius: 3 }}>[mistake]</span>
                        {" "}every{" "}
                        <span className="text-fuchsia-300 font-semibold" style={{ background: 'rgba(192,38,211,0.15)', padding: '0 4px', borderRadius: 3 }}>[niche]</span>
                        {" "}creator makes with{" "}
                        <span className="text-amber-300 font-semibold" style={{ background: 'rgba(245,158,11,0.15)', padding: '0 4px', borderRadius: 3 }}>[topic]</span>
                        "
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase tracking-wider">Your angle</span>
                      <p className="text-slate-300 text-sm mt-1" data-testid="text-brief-flow">
                        Hook → Mistake reveal → Why it matters → CTA
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase tracking-wider">Your CTA</span>
                      <p className="text-slate-300 text-sm mt-1" data-testid="text-brief-cta">
                        Comment "MISTAKE" and I'll send you the full breakdown.
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
                  Request early access →
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
                {
                  icon: BarChart3,
                  title: "Built on real performance",
                  desc: "Every signal is backed by thousands of real videos analyzed across your niche — not generated content or guesses.",
                },
                {
                  icon: Target,
                  title: "Focused on your niche",
                  desc: "You choose your niche once. Craflect filters every signal, pattern and brief for your specific audience.",
                },
                {
                  icon: TrendingUp,
                  title: "Updated every 72 hours",
                  desc: "The engine re-scans every 72 hours so you're always working from fresh data — not last month's trends.",
                },
                {
                  icon: Video,
                  title: "From signal to brief in seconds",
                  desc: "One click turns a pattern into a ready-to-shoot brief. Topic, hook, flow, CTA — all pre-filled.",
                },
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
                <p className="text-slate-400 text-lg">{t.landing.pricingSubtitle}</p>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="max-w-sm mx-auto">
                <div className="relative rounded-2xl p-8 border bg-slate-900 border-purple-500/50 shadow-xl shadow-purple-500/10">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                      Beta Access
                    </span>
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-white mb-1">Founding Member</h3>
                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      <span className="text-5xl font-bold text-white">Free</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">During beta</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      "Full access to the Pattern Engine",
                      "20 niches tracked in real time",
                      "Unlimited brief generation",
                      "Priority access to new features",
                      "Founder badge on your profile",
                      "Locked-in pricing at launch",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={handleGetStarted}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base font-semibold rounded-xl"
                    data-testid="button-plan-founding"
                  >
                    Request early access →
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
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
              <p className="text-slate-400 text-lg mb-8">Join the founding cohort. 100 spots. Full access. Free during beta.</p>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-14 text-lg rounded-full shadow-lg shadow-purple-500/25"
                data-testid="button-final-cta"
              >
                Request early access →
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-slate-500 text-sm mt-4">We review every application personally.</p>
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
