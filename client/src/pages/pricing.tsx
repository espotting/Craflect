import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  ArrowRight,
  Sun,
  Moon,
  UserCircle2,
  Brain,
  HelpCircle,
  Shield,
  Target,
  BarChart3,
  Layers,
  Microscope,
  RefreshCw,
} from "lucide-react";
import logoLight from "@/assets/logo-light.png";
import logoTransparent from "@/assets/logo-transparent.png";

type ComparisonRow = {
  feature: string;
  icon: typeof Target;
  starter: string;
  pro: string;
  studio: string;
  badgeStyle?: { starter?: string; pro?: string; studio?: string };
};

function CellBadge({ value, style }: { value: string; style?: string }) {
  if (value === "—") return <span className="text-muted-foreground/40">—</span>;
  if (value === "✓") return <Check className="w-4 h-4 text-primary mx-auto" />;
  if (style) {
    return (
      <Badge className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${style}`}>
        {value}
      </Badge>
    );
  }
  return <span>{value}</span>;
}

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const handleCta = () => {
    setLocation(isAuthenticated ? "/dashboard" : "/auth");
  };

  const plans = [
    {
      name: t.pricing.starter.name,
      price: 29,
      icon: Zap,
      description: t.pricing.starter.description,
      highlight: false,
      cta: t.pricing.finalCta,
      note: null as string | null,
      features: [
        `1 ${t.pricing.features.niche}`,
        `20 ${t.pricing.features.analyses}`,
        t.pricing.features.unlimitedContent,
        `${t.pricing.comparisonValues.standard} ${t.pricing.comparison.learningCycles.toLowerCase()}`,
        t.pricing.comparisonValues.singleNiche,
      ],
    },
    {
      name: t.pricing.pro.name,
      price: 69,
      icon: Sparkles,
      description: t.pricing.pro.description,
      highlight: true,
      badge: t.pricing.badge,
      cta: t.pricing.finalCta,
      note: t.pricing.pro.note,
      features: [
        `3 ${t.pricing.features.niches}`,
        `100 ${t.pricing.features.analyses}`,
        t.pricing.features.unlimitedContent,
        t.pricing.features.advancedInsights,
        t.pricing.features.priorityQueue,
        t.pricing.comparisonValues.reusableNiche,
      ],
    },
    {
      name: t.pricing.studio.name,
      price: 199,
      icon: Crown,
      description: t.pricing.studio.description,
      highlight: false,
      cta: t.pricing.finalCta,
      note: null as string | null,
      features: [
        t.pricing.features.unlimitedNiches,
        `300 ${t.pricing.features.analyses}`,
        t.pricing.features.unlimitedContent,
        t.pricing.features.multiWorkspace,
        `${t.pricing.features.deeperAnalysis} & ${t.pricing.features.aiRefresh}`,
        `${t.pricing.comparisonValues.premium} ${t.pricing.comparison.learningCycles.toLowerCase()}`,
        t.pricing.comparisonValues.crossBrand,
      ],
    },
  ];

  const comparisonRows: ComparisonRow[] = [
    { feature: t.pricing.comparison.nichesIncluded, icon: Target, starter: "1", pro: "3", studio: t.pricing.comparisonValues.unlimited },
    { feature: t.pricing.comparison.analysesMonth, icon: BarChart3, starter: "20", pro: "100", studio: "300" },
    { feature: t.pricing.comparison.contentGeneration, icon: Sparkles, starter: t.pricing.comparisonValues.unlimited, pro: t.pricing.comparisonValues.unlimited, studio: t.pricing.comparisonValues.unlimited },
    {
      feature: t.pricing.comparison.learningCycles,
      icon: Zap,
      starter: t.pricing.comparisonValues.standard,
      pro: t.pricing.comparisonValues.priority,
      studio: t.pricing.comparisonValues.premium,
      badgeStyle: {
        starter: "bg-muted/80 text-foreground/70 border-border",
        pro: "bg-primary/15 text-primary border-primary/20",
        studio: "bg-secondary text-white border-secondary",
      },
    },
    { feature: t.pricing.comparison.patternIntelligence, icon: Brain, starter: t.pricing.comparisonValues.basic, pro: t.pricing.comparisonValues.advanced, studio: t.pricing.comparisonValues.advanced },
    { feature: t.pricing.comparison.multiWorkspace, icon: Layers, starter: "—", pro: "—", studio: "✓" },
    { feature: t.pricing.comparison.deeperAnalysis, icon: Microscope, starter: "—", pro: "—", studio: "✓" },
    { feature: t.pricing.comparison.aiRefresh, icon: RefreshCw, starter: "—", pro: "—", studio: "✓" },
    {
      feature: t.pricing.comparison.aiLearningDepth,
      icon: Brain,
      starter: t.pricing.comparisonValues.singleNiche,
      pro: t.pricing.comparisonValues.reusableNiche,
      studio: t.pricing.comparisonValues.crossBrand,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="relative z-10 w-full px-4 sm:px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <button onClick={() => setLocation("/")} className="flex items-center gap-3" data-testid="link-home">
          <img src={isDark ? logoTransparent : logoLight} alt="Craflect" className="h-10 w-auto object-contain" data-testid="logo-pricing" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLocation("/pricing")}
            className="hidden sm:inline-flex text-sm font-medium text-primary px-3 py-1.5"
            data-testid="nav-pricing"
          >
            {t.nav.pricing}
          </button>
          <LanguageSwitcher />
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-muted hover:bg-accent text-foreground transition-all border border-border"
            data-testid="button-theme-toggle-pricing"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {!isAuthenticated && (
            <>
              <button
                onClick={() => setLocation("/auth?mode=login")}
                className="p-2.5 rounded-full bg-muted hover:bg-accent text-foreground transition-all border border-border"
                data-testid="button-login-pricing"
              >
                <UserCircle2 className="w-5 h-5" />
              </button>
              <Button
                className="rounded-full px-6 sm:px-8 bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20 font-medium"
                onClick={() => setLocation("/auth")}
                data-testid="button-signup-pricing"
              >
                {t.nav.signUp}
              </Button>
            </>
          )}
          {isAuthenticated && (
            <Button
              className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white font-medium"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-dashboard-pricing"
            >
              {t.sidebar.dashboard}
            </Button>
          )}
        </div>
      </nav>

      <main className="flex-1 px-4 sm:px-6 pb-20">
        <section className="max-w-5xl mx-auto text-center pt-10 sm:pt-16 pb-8 relative">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted dark:bg-white/5 border border-border dark:border-white/10 text-sm font-medium text-primary mb-6">
              <Brain className="w-4 h-4" />
              {t.landing.badge}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              {t.pricing.title}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-6">
              {t.pricing.subtitle}
            </p>
          </motion.div>
        </section>

        <section className="max-w-md mx-auto mb-10">
          <div className="flex items-center justify-center gap-3">
            <Badge className="px-3.5 py-1.5 text-xs font-medium gap-1.5 rounded-full bg-primary/15 dark:bg-primary/20 text-primary border border-primary/20 hover:bg-primary/20">
              <Shield className="w-3 h-3" />
              {t.pricing.trustBadges[0]}
            </Badge>
            <Badge className="px-3.5 py-1.5 text-xs font-medium gap-1.5 rounded-full bg-secondary/15 dark:bg-secondary/20 text-secondary border border-secondary/20 hover:bg-secondary/20">
              <Check className="w-3 h-3" />
              {t.pricing.trustBadges[1]}
            </Badge>
            <Badge className="px-3.5 py-1.5 text-xs font-medium gap-1.5 rounded-full bg-primary/15 dark:bg-primary/20 text-primary border border-primary/20 hover:bg-primary/20">
              <Check className="w-3 h-3" />
              {t.pricing.trustBadges[2]}
            </Badge>
          </div>
        </section>

        <section className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card
                  className={`relative h-full flex flex-col ${
                    plan.highlight
                      ? "border-primary border-2 shadow-lg shadow-primary/10"
                      : "border-border"
                  }`}
                  data-testid={`card-plan-${plan.name.toLowerCase()}`}
                >
                  {plan.badge && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 text-xs font-bold rounded-full shadow-md">
                      {plan.badge}
                    </Badge>
                  )}
                  <CardContent className="p-6 sm:p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        plan.highlight ? "bg-primary/15" : "bg-muted"
                      }`}>
                        <plan.icon className={`w-5 h-5 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
                    </div>

                    <div className="mb-2">
                      <span className="text-3xl sm:text-4xl font-extrabold text-foreground">{plan.price}€</span>
                      <span className="text-sm text-muted-foreground ml-1">{t.pricing.monthly}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic mb-4">
                      {t.pricing.payForLearning}
                    </p>

                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{plan.description}</p>

                    {plan.note && (
                      <p className="text-xs text-primary/80 font-medium mb-4 italic">
                        {plan.note}
                      </p>
                    )}

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={handleCta}
                      className={`w-full rounded-lg h-11 font-medium ${
                        plan.highlight
                          ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                          : "bg-foreground hover:bg-foreground/90 text-background"
                      }`}
                      data-testid={`button-plan-${plan.name.toLowerCase()}`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <p className="text-[11px] text-center mt-2.5">
                      <span className="text-muted-foreground">{t.pricing.freeTrialLine} </span>
                      <span className="text-secondary font-medium">{t.pricing.cancelAnytime}</span>
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto mt-16 sm:mt-20">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground text-center mb-8">
            {t.pricing.comparison.title}
          </h2>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-comparison">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-4 px-4 text-muted-foreground font-medium w-[28%]"></th>
                  <th className="text-center py-4 px-5 text-foreground font-bold w-[24%]">{t.pricing.starter.name}</th>
                  <th className="text-center py-4 px-5 text-primary font-bold w-[24%] bg-primary/5 dark:bg-primary/5 rounded-t-xl border-x border-primary/10">{t.pricing.pro.name}</th>
                  <th className="text-center py-4 px-5 text-foreground font-bold w-[24%]">{t.pricing.studio.name}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={row.feature} className={`border-b border-border/40 ${idx % 2 === 0 ? "bg-muted/20 dark:bg-muted/5" : ""}`}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <row.icon className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                        {row.feature}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-center text-foreground/80">
                      <CellBadge value={row.starter} style={row.badgeStyle?.starter} />
                    </td>
                    <td className="py-3.5 px-5 text-center text-foreground/80 font-medium bg-primary/5 dark:bg-primary/5 border-x border-primary/10">
                      <CellBadge value={row.pro} style={row.badgeStyle?.pro} />
                    </td>
                    <td className="py-3.5 px-5 text-center text-foreground/80">
                      <CellBadge value={row.studio} style={row.badgeStyle?.studio} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4">
            {plans.map((plan) => (
              <Card key={plan.name} className={`${plan.highlight ? "border-primary border-2" : "border-border"}`} data-testid={`card-compare-${plan.name.toLowerCase()}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <plan.icon className={`w-5 h-5 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                    <h4 className="font-display font-bold text-foreground">{plan.name}</h4>
                    <span className="text-sm text-muted-foreground ml-auto">{plan.price}€/mo</span>
                  </div>
                  <div className="space-y-2.5">
                    {comparisonRows.map((row) => {
                      const val = plan.name === t.pricing.starter.name ? row.starter : plan.name === t.pricing.pro.name ? row.pro : row.studio;
                      if (val === "—") return null;
                      return (
                        <div key={row.feature} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <row.icon className="w-3.5 h-3.5 text-muted-foreground/50" />
                            {row.feature}
                          </div>
                          <span className="text-foreground font-medium text-xs">{val === "✓" ? <Check className="w-4 h-4 text-primary" /> : val}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="max-w-2xl mx-auto mt-16 sm:mt-20" data-testid="section-faq">
          <div className="p-6 sm:p-8 rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border">
            <div className="flex items-start gap-3 mb-1">
              <HelpCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <h3 className="font-display text-lg font-bold text-foreground">{t.pricing.faq.q1}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-8">
              {t.pricing.faq.a1}
            </p>
          </div>
        </section>

        <section className="max-w-xl mx-auto mt-14 sm:mt-16 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
            {t.pricing.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t.pricing.subtitle}
          </p>
          <Button
            onClick={handleCta}
            className="rounded-full px-8 h-12 bg-primary hover:bg-primary/90 text-white text-base font-medium shadow-lg shadow-primary/20"
            data-testid="button-bottom-cta"
          >
            {t.pricing.finalCta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-[11px] mt-3">
            <span className="text-muted-foreground">{t.pricing.freeTrialLine} </span>
            <span className="text-secondary font-medium">{t.pricing.cancelAnytime}</span>
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center">
        <p className="text-xs text-muted-foreground">
          {t.landing.copyright.replace("{year}", new Date().getFullYear().toString())}
        </p>
      </footer>
    </div>
  );
}
