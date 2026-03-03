import { DashboardLayout } from "@/components/layout";
import { Activity, BarChart3, Zap, TrendingUp, Plus, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useWorkspaceAnalytics } from "@/hooks/use-analytics";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const { data: workspaces } = useWorkspaces();
  const selectedWorkspace = workspaces?.[0];
  const { data: analytics, isLoading: analyticsLoading } = useWorkspaceAnalytics(selectedWorkspace?.id);
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [intelligenceMode, setIntelligenceMode] = useState<"global" | "workspace">("global");

  const nicheId = selectedWorkspace?.nicheId;

  const { data: snapshot, isLoading: snapshotLoading } = useQuery<{
    niche: any;
    scoring: {
      totalVideos: number;
      confidence: number;
      confidencePercent: number;
      signalStrength: number;
      signalStrengthPercent: number;
      intelligenceStatus: string;
    };
    notReady?: boolean;
    recommendation: any;
    distributions: any;
  }>({
    queryKey: ["/api/niches", nicheId, "snapshot"],
    enabled: !!nicheId && intelligenceMode === "global",
  });

  const { data: workspaceIntel, isLoading: wsIntelLoading } = useQuery<any>({
    queryKey: ["/api/workspaces", selectedWorkspace?.id, "intelligence"],
    enabled: !!selectedWorkspace?.id && intelligenceMode === "workspace",
  });

  const activeIntel = intelligenceMode === "global" ? snapshot : workspaceIntel;
  const isLoading = analyticsLoading || snapshotLoading || wsIntelLoading;

  const contentCreated = analytics?.generatedCount ?? 0;
  const contentTracked = analytics?.performanceData?.length ?? 0;
  const signalStrengthPct = activeIntel?.scoring?.signalStrengthPercent ?? 0;
  const confidencePct = activeIntel?.scoring?.confidencePercent ?? 0;
  const hasNoData = !activeIntel || activeIntel.notReady || (activeIntel.scoring?.totalVideos ?? 0) < 3;

  function getSignalInterpretation(pct: number): string {
    if (pct < 40) return t.analytics.signalWeak;
    if (pct < 60) return t.analytics.signalEmerging;
    if (pct < 80) return t.analytics.strongSignal;
    return t.analytics.clearPatterns;
  }

  const metrics = [
    {
      label: t.analytics.contentCreated,
      value: String(contentCreated),
      icon: BarChart3,
      color: "text-blue-500",
      testId: "content-created",
    },
    {
      label: t.analytics.contentTracked,
      value: String(contentTracked),
      icon: Activity,
      color: "text-purple-500",
      testId: "content-tracked",
    },
    {
      label: t.analytics.signalStrength,
      value: `${signalStrengthPct}%`,
      icon: Zap,
      color: "text-amber-500",
      testId: "signal-strength",
      badge: getSignalInterpretation(signalStrengthPct),
    },
    {
      label: t.analytics.confidence,
      value: `${confidencePct}%`,
      icon: TrendingUp,
      color: "text-emerald-500",
      testId: "confidence",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="font-display text-3xl font-bold text-foreground" data-testid="text-analytics-title">
            {t.analytics.title}
          </h1>
          {selectedWorkspace && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1" data-testid="toggle-analytics-mode">
              <button
                onClick={() => setIntelligenceMode("global")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  intelligenceMode === "global"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid="button-analytics-global"
              >
                {t.dashboard.globalSignal}
              </button>
              <button
                onClick={() => setIntelligenceMode("workspace")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  intelligenceMode === "workspace"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid="button-analytics-workspace"
              >
                {t.dashboard.yourDataset}
              </button>
            </div>
          )}
        </div>

        {hasNoData && !isLoading ? (
          <Card data-testid="card-analytics-empty">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <Brain className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-no-data-title">
                {t.analytics.noDataTitle}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6" data-testid="text-no-data-desc">
                {t.analytics.noDataDesc}
              </p>
              <Button onClick={() => setLocation("/library")} data-testid="button-add-content-empty">
                <Plus className="w-4 h-4 mr-2" />
                {t.analytics.addContent}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoading
                ? [1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-6 space-y-3">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-16" />
                      </CardContent>
                    </Card>
                  ))
                : metrics.map((m) => (
                    <Card key={m.testId} data-testid={`card-metric-${m.testId}`}>
                      <CardContent className="pt-6">
                        <div className={`p-2 rounded-md bg-muted border border-border w-fit mb-3 ${m.color}`}>
                          <m.icon className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                          {m.label}
                        </p>
                        <p className="text-2xl font-bold text-foreground" data-testid={`text-${m.testId}`}>
                          {m.value}
                        </p>
                        {m.badge && (
                          <Badge variant="secondary" className="mt-2" data-testid={`badge-${m.testId}`}>
                            {m.badge}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
            </div>

            <Card data-testid="card-learning-message">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                <p className="text-sm text-muted-foreground" data-testid="text-analytics-subtitle">
                  {intelligenceMode === "global" ? t.analytics.globalMode : t.analytics.workspaceMode}
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-start">
              <Button onClick={() => setLocation("/library")} data-testid="button-add-content">
                <Plus className="w-4 h-4 mr-2" />
                {t.analytics.addContent}
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
