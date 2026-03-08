import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, BarChart3, Activity, Lock } from "lucide-react";

function MiniChart({ type }: { type: "growth" | "hook" | "format" | "velocity" }) {
  const paths: Record<string, string> = {
    growth: "M 0 60 Q 30 55, 60 45 T 120 35 T 180 20 T 240 15",
    hook: "M 0 50 L 30 30 L 60 40 L 90 20 L 120 25 L 150 10 L 180 15 L 210 5 L 240 8",
    format: "M 0 55 Q 40 50, 80 35 T 160 25 T 240 10",
    velocity: "M 0 60 Q 20 58, 40 50 T 80 35 T 120 20 T 160 30 T 200 10 T 240 5",
  };

  const colors: Record<string, { stroke: string; fill: string }> = {
    growth: { stroke: "hsl(var(--primary))", fill: "hsl(var(--primary) / 0.1)" },
    hook: { stroke: "hsl(142 76% 36%)", fill: "hsl(142 76% 36% / 0.1)" },
    format: { stroke: "hsl(var(--secondary))", fill: "hsl(var(--secondary) / 0.1)" },
    velocity: { stroke: "hsl(38 92% 50%)", fill: "hsl(38 92% 50% / 0.1)" },
  };

  const color = colors[type];

  return (
    <svg viewBox="0 0 240 70" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color.fill} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d={paths[type] + " L 240 70 L 0 70 Z"}
        fill={`url(#grad-${type})`}
      />
      <path
        d={paths[type]}
        fill="none"
        stroke={color.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniBarChart() {
  const bars = [35, 55, 45, 70, 60, 80, 50, 65, 75, 85, 40, 90];
  return (
    <svg viewBox="0 0 240 70" className="w-full h-full" preserveAspectRatio="none">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 20 + 2}
          y={70 - h * 0.7}
          width="14"
          height={h * 0.7}
          rx="2"
          fill="hsl(var(--primary) / 0.3)"
        />
      ))}
    </svg>
  );
}

const featureConfigs = [
  {
    key: "nicheGrowthCharts" as const,
    icon: TrendingUp,
    chartType: "growth" as const,
    useBarChart: false,
    change: "+24.5%",
    changePositive: true,
  },
  {
    key: "hookPerformance" as const,
    icon: Zap,
    chartType: "hook" as const,
    useBarChart: true,
    change: "+18.2%",
    changePositive: true,
  },
  {
    key: "formatSuccessRates" as const,
    icon: BarChart3,
    chartType: "format" as const,
    useBarChart: false,
    change: "+31.7%",
    changePositive: true,
  },
  {
    key: "trendVelocity" as const,
    icon: Activity,
    chartType: "velocity" as const,
    useBarChart: false,
    change: "+42.1%",
    changePositive: true,
  },
];

export default function Insights() {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="page-insights">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-insights-title">
            {t.insightsPage.title}
          </h1>
          <p className="text-muted-foreground" data-testid="text-insights-subtitle">
            {t.insightsPage.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" data-testid="badge-coming-soon">
            <Lock className="w-3 h-3 mr-1" />
            {t.insightsPage.comingSoon}
          </Badge>
          <span className="text-sm text-muted-foreground" data-testid="text-coming-soon-desc">
            {t.insightsPage.comingSoonDesc}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featureConfigs.map((feature) => {
            const Icon = feature.icon;
            const titleKey = feature.key;
            const descKey = `${feature.key}Desc` as `${typeof titleKey}Desc`;
            return (
              <Card
                key={feature.key}
                className="relative overflow-hidden p-5 space-y-3 opacity-75"
                data-testid={`card-insight-${feature.key}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">
                        {t.insightsPage[titleKey]}
                      </h3>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    {feature.change}
                  </span>
                </div>

                <div className="h-16 w-full">
                  {feature.useBarChart ? <MiniBarChart /> : <MiniChart type={feature.chartType} />}
                </div>

                <p className="text-xs text-muted-foreground">
                  {t.insightsPage[descKey]}
                </p>

                <div className="absolute inset-0 bg-background/60 dark:bg-background/70 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted border border-border">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {t.insightsPage.comingSoon}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground pt-4" data-testid="text-stay-tuned">
          {t.insightsPage.stayTuned}
        </p>
      </div>
    </DashboardLayout>
  );
}