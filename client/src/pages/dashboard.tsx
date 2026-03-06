import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Video,
  Users,
  Layers,
  Grid3X3,
  Zap,
  BarChart3,
  Plus,
  Activity,
  Sparkles,
} from "lucide-react";

interface RadarData {
  metrics: {
    total_videos: number;
    videos_today: number;
    active_niches: number;
    creators_detected: number;
  };
  trending_hooks: Array<{
    hook_text: string;
    hook_mechanism_primary: string | null;
    count: string;
    avg_virality: string | null;
  }>;
  trending_formats: Array<{
    structure_type: string;
    count: string;
    avg_virality: string | null;
  }>;
}

function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  testId,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground" data-testid={`${testId}-value`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex-shrink-0 w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HooksTable({
  hooks,
  t,
}: {
  hooks: RadarData["trending_hooks"];
  t: any;
}) {
  if (!hooks || hooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Zap className="w-8 h-8 text-muted-foreground/20 mb-2" />
        <p className="text-sm text-muted-foreground">{t.dashboard.noDataDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hooks.slice(0, 5).map((hook, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
          data-testid={`row-hook-${i}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-mono text-muted-foreground w-5 flex-shrink-0">
              {i + 1}.
            </span>
            <span className="text-sm text-foreground truncate">
              {hook.hook_text || hook.hook_mechanism_primary?.replace(/_/g, " ") || "—"}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {hook.hook_mechanism_primary && (
              <Badge variant="outline" className="text-[10px]">
                {hook.hook_mechanism_primary.replace(/_/g, " ")}
              </Badge>
            )}
            <span className="text-xs font-mono text-muted-foreground w-8 text-right">
              {hook.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FormatsTable({
  formats,
  t,
}: {
  formats: RadarData["trending_formats"];
  t: any;
}) {
  if (!formats || formats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <BarChart3 className="w-8 h-8 text-muted-foreground/20 mb-2" />
        <p className="text-sm text-muted-foreground">{t.dashboard.noDataDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {formats.slice(0, 5).map((format, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
          data-testid={`row-format-${i}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-mono text-muted-foreground w-5 flex-shrink-0">
              {i + 1}.
            </span>
            <span className="text-sm text-foreground">
              {format.structure_type?.replace(/_/g, " ") || "—"}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {format.avg_virality && (
              <Badge variant="outline" className="text-[10px]">
                {format.avg_virality}
              </Badge>
            )}
            <span className="text-xs font-mono text-muted-foreground w-8 text-right">
              {format.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const userNiches = user?.selectedNiches || [];
  const [activeNiche, setActiveNiche] = useState<string | null>(null);

  const nicheQueryParam = activeNiche ? `?niche=${activeNiche}` : "";

  const { data: radarData, isLoading } = useQuery<RadarData>({
    queryKey: ["/api/trends/radar" + nicheQueryParam],
  });

  const metrics = radarData?.metrics;
  const patternsCount =
    (radarData?.trending_hooks?.length || 0) +
    (radarData?.trending_formats?.length || 0);

  function getNicheLabel(niche: string): string {
    return TOPIC_CLUSTER_LABELS[niche] || niche.replace(/_/g, " ");
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-md" />
            <Skeleton className="h-28 rounded-md" />
            <Skeleton className="h-28 rounded-md" />
            <Skeleton className="h-28 rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-md" />
            <Skeleton className="h-64 rounded-md" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground" data-testid="text-dashboard-title">
              {t.dashboard.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-dashboard-subtitle">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap" data-testid="tabs-niche">
          <Button
            variant={activeNiche === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveNiche(null)}
            data-testid="tab-niche-all"
          >
            <Grid3X3 className="w-3.5 h-3.5 mr-1.5" />
            {t.dashboard.allNiches}
          </Button>

          {userNiches.map((niche) => (
            <Button
              key={niche}
              variant={activeNiche === niche ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveNiche(niche)}
              data-testid={`tab-niche-${niche}`}
            >
              {getNicheLabel(niche)}
            </Button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/settings")}
            data-testid="button-add-niche"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {t.dashboard.addNiche}
          </Button>
        </div>

        {metrics ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label={t.dashboard.videosAnalyzed}
                value={metrics.total_videos}
                subtitle={`+${metrics.videos_today} ${t.dashboard.videosToday.toLowerCase()}`}
                icon={Video}
                testId="card-metric-videos"
              />
              <MetricCard
                label={t.dashboard.creatorsDetected}
                value={metrics.creators_detected}
                icon={Users}
                testId="card-metric-creators"
              />
              <MetricCard
                label={t.dashboard.patternsDetected}
                value={patternsCount}
                icon={Layers}
                testId="card-metric-patterns"
              />
              <MetricCard
                label={t.dashboard.activeNiches}
                value={metrics.active_niches}
                icon={Activity}
                testId="card-metric-niches"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card data-testid="card-top-hooks">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      {t.dashboard.topHooks}
                    </span>
                  </div>
                  <HooksTable hooks={radarData?.trending_hooks || []} t={t} />
                </CardContent>
              </Card>

              <Card data-testid="card-top-formats">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      {t.dashboard.topFormats}
                    </span>
                  </div>
                  <FormatsTable formats={radarData?.trending_formats || []} t={t} />
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card data-testid="card-no-data">
            <CardContent className="p-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Activity className="w-7 h-7 text-primary/40" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-no-data-title">
                {t.dashboard.noDataTitle}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md" data-testid="text-no-data-desc">
                {t.dashboard.noDataDesc}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
