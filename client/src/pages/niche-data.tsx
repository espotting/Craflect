import { DashboardLayout } from "@/components/layout";
import { ArrowLeft, BarChart3, Database, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function NicheData() {
  const { data: workspaces } = useWorkspaces();
  const selectedWorkspace = workspaces?.[0];
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const nicheId = selectedWorkspace?.nicheId;

  const { data: availableNiches } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/niches/available"],
    enabled: !nicheId,
  });

  const resolvedNicheId = nicheId || availableNiches?.[0]?.id;

  const { data: snapshot, isLoading } = useQuery<{
    niche: any;
    scoring: {
      totalVideos: number;
      confidence: number;
      confidencePercent: number;
      signalStrength: number;
      signalStrengthPercent: number;
      intelligenceStatus: string;
      topHooks: string[];
      topFormats: string[];
      topAngles: string[];
      avgDuration?: number;
      medianDuration?: number;
      volumeScore?: number;
      consistencyScore?: number;
      stabilityScore?: number;
    };
    recommendation: any;
    distributions: {
      hooks?: Array<{ name: string; percentage: number }>;
      structures?: Array<{ name: string; percentage: number }>;
      formats?: Array<{ name: string; percentage: number }>;
      angles?: Array<{ name: string; percentage: number }>;
    };
  }>({
    queryKey: ["/api/niches", resolvedNicheId, "snapshot"],
    enabled: !!resolvedNicheId,
  });

  const scoring = snapshot?.scoring;
  const distributions = snapshot?.distributions;

  function renderDistributionTable(
    title: string,
    icon: typeof BarChart3,
    items: Array<{ name: string; percentage: number }> | undefined,
    testId: string
  ) {
    const Icon = icon;
    const sorted = items ? [...items].sort((a, b) => b.percentage - a.percentage) : [];
    return (
      <Card data-testid={`card-${testId}`}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            {title}
          </CardTitle>
          <Badge variant="secondary" data-testid={`badge-${testId}-count`}>
            {sorted.length}
          </Badge>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">—</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider pb-1 border-b border-border">
                <span>{t.nicheData.count}</span>
                <span>{t.nicheData.percentage}</span>
              </div>
              {sorted.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-1.5"
                  data-testid={`row-${testId}-${i}`}
                >
                  <span className="text-sm text-foreground font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground" data-testid="text-niche-data-title">
              {t.nicheData.title}
            </h1>
            <p className="text-muted-foreground text-sm" data-testid="text-niche-data-subtitle">
              {t.nicheData.subtitle}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !snapshot ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Database className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No data available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card data-testid="card-total-videos">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                    {t.nicheData.totalVideos}
                  </p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-videos">
                    {scoring?.totalVideos ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="card-avg-duration">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                    {t.nicheData.avgDuration}
                  </p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-avg-duration">
                    {scoring?.avgDuration ? `${Math.round(scoring.avgDuration)}s` : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="card-median-duration">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                    {t.nicheData.medianDuration}
                  </p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-median-duration">
                    {scoring?.medianDuration ? `${Math.round(scoring.medianDuration)}s` : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-confidence-details">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  {t.nicheData.confidenceDetails}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div data-testid="text-volume-score">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      {t.nicheData.volumeScore}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {scoring?.volumeScore != null ? `${(scoring.volumeScore * 100).toFixed(0)}%` : "—"}
                    </p>
                  </div>
                  <div data-testid="text-consistency-score">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      {t.nicheData.consistencyScore}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {scoring?.consistencyScore != null ? `${(scoring.consistencyScore * 100).toFixed(0)}%` : "—"}
                    </p>
                  </div>
                  <div data-testid="text-stability-score">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      {t.nicheData.stabilityScore}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {scoring?.stabilityScore != null ? `${(scoring.stabilityScore * 100).toFixed(0)}%` : "—"}
                    </p>
                  </div>
                  <div data-testid="text-final-confidence">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      {t.nicheData.finalConfidence}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {scoring?.confidencePercent != null ? `${scoring.confidencePercent}%` : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderDistributionTable(t.nicheData.hookDistribution, BarChart3, distributions?.hooks, "hook-dist")}
              {renderDistributionTable(t.nicheData.structureDistribution, Database, distributions?.structures, "structure-dist")}
              {renderDistributionTable(t.nicheData.formatDistribution, BarChart3, distributions?.formats, "format-dist")}
              {renderDistributionTable(t.nicheData.angleDistribution, Activity, distributions?.angles, "angle-dist")}
            </div>

            <div className="flex justify-start">
              <Button
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-back-to-dashboard"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.nicheData.backToDashboard}
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
