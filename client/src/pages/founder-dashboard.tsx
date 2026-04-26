import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserPlus,
  Activity,
  RefreshCw,
  BarChart3,
  Clock,
  FileText,
  FolderKanban,
  Layers,
  DollarSign,
  CreditCard,
  TrendingUp,
  Hourglass,
  ArrowUpRight,
  Video,
  Sparkles,
  Target,
  Repeat,
  Globe,
  Flame,
  Award,
  Server,
  CheckCircle,
  Cpu,
  Bell,
  Crown,
  AlertTriangle,
  CalendarDays,
  Gauge,
  Download,
  CheckSquare,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

interface FounderMetrics {
  users: {
    total_users: number;
    new_users_7d: number;
    active_users_24h: number;
    active_users_7d: number;
    monthly_active_users: number;
    dau_mau_ratio: number;
    returning_users_rate: number;
  };
  usage: {
    sessions_today: number;
    avg_session_duration: number;
    scripts_generated: number;
    projects_created: number;
    patterns_used_in_create: number;
  };
  revenue: {
    active_subscriptions: number;
    mrr: number;
    mrr_growth_30d: number;
    arpu: number;
    active_trials: number;
    trial_to_paid_conversion_rate: number;
  };
  engine: {
    total_videos_analysed: number;
    videos_ingested_today: number;
    videos_classified_today: number;
    total_patterns_detected: number;
    patterns_score_above_70: number;
    pattern_reuse_rate: number;
    cross_platform_pattern_rate: number;
    cross_platform_patterns_count: number;
    rising_patterns_count: number;
    average_pattern_score: number;
  };
  dataset_health: {
    total_videos: number;
    classified_videos: number;
    pending_videos: number;
    failed_videos: number;
    videos_last_24h: number;
    creator_coverage: number;
    unknown_creators: number;
    avg_view_velocity: number;
  };
  pipeline_status: {
    last_ingestion_run: string | null;
    last_classification_run: string | null;
    last_pattern_engine_run: string | null;
  };
  system_health: {
    ingestion_runs_today: number;
    classifier_success_rate: number;
    pattern_engine_runs: number;
    alerts_triggered: number;
  };
  charts: {
    videos_over_time: Array<{ date: string; count: number }>;
    patterns_over_time: Array<{ date: string; count: number }>;
    pattern_reuse_over_time: Array<{ date: string; rate: number }>;
    cross_platform_over_time: Array<{ date: string; count: number }>;
  };
}

function ColoredMetricCard({
  label,
  value,
  icon: Icon,
  color,
  testId,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  testId: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-500", iconBg: "bg-blue-500/20" },
    green: { bg: "bg-emerald-500/10", text: "text-emerald-500", iconBg: "bg-emerald-500/20" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-500", iconBg: "bg-violet-500/20" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-500", iconBg: "bg-orange-500/20" },
    gray: { bg: "bg-zinc-500/10", text: "text-zinc-400", iconBg: "bg-zinc-500/20" },
  };

  const c = colorMap[color] || colorMap.gray;

  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
            <p className="text-xl font-bold text-foreground" data-testid={`${testId}-value`}>
              {value}
            </p>
          </div>
          <div className={`flex-shrink-0 w-8 h-8 rounded-md ${c.iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${c.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  color,
  testId,
}: {
  title: string;
  color: string;
  testId: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500",
    green: "text-emerald-500",
    violet: "text-violet-500",
    orange: "text-orange-500",
    gray: "text-zinc-400",
  };

  return (
    <h2
      className={`text-xs font-bold uppercase tracking-widest ${colorMap[color] || "text-muted-foreground"} mb-3`}
      data-testid={testId}
    >
      {title}
    </h2>
  );
}

function formatPercent(val: number): string {
  if (val == null || isNaN(val)) return "0%";
  return `${(val * 100).toFixed(1)}%`;
}

function formatCurrency(val: number): string {
  if (val == null || isNaN(val)) return "€0";
  return `€${val.toFixed(0)}`;
}

function formatDuration(minutes: number): string {
  if (minutes == null || isNaN(minutes)) return "0m";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  return `${minutes.toFixed(0)}m`;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};

const axisTick = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };

export default function FounderDashboard() {
  const { t } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !(user as any)?.isAdmin) {
      setLocation("/home");
    }
  }, [authLoading, user, setLocation]);

  const { data, isLoading } = useQuery<FounderMetrics>({
    queryKey: ["/api/admin/founder"],
    enabled: !!(user as any)?.isAdmin,
  });

  const { data: pipeline } = useQuery<any>({
    queryKey: ["/api/founder/pipeline"],
    enabled: !!(user as any)?.isAdmin,
    refetchInterval: 30000,
  });

  const { data: usersData } = useQuery<any>({
    queryKey: ["/api/founder/users"],
    enabled: !!(user as any)?.isAdmin,
  });

  const { data: waitlistData } = useQuery<any>({
    queryKey: ["/api/founder/waitlist"],
    enabled: !!(user as any)?.isAdmin,
  });

  const { data: platformHealth = [] } = useQuery<any[]>({
    queryKey: ['/api/founder/platform-health'],
    enabled: !!(user as any)?.isAdmin,
    refetchInterval: 60000,
  });

  const { data: onboardingFunnel } = useQuery<any>({
    queryKey: ['/api/founder/onboarding-funnel'],
    enabled: !!(user as any)?.isAdmin,
    refetchInterval: 60000,
  });

  const { data: studioFunnel } = useQuery<any>({
    queryKey: ['/api/founder/studio-funnel'],
    enabled: !!(user as any)?.isAdmin,
    refetchInterval: 30000,
  });

  const { data: signalHealth } = useQuery<any>({
    queryKey: ['/api/founder/signal-health'],
    enabled: !!(user as any)?.isAdmin,
    refetchInterval: 120000,
  });

  const { toast } = useToast();

  const actionMutation = useMutation({
    mutationFn: async (action: string) => {
      const res = await apiRequest("POST", `/api/founder/actions/${action}`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: data.message || "Action triggered" });
    },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  if (authLoading || !(user as any)?.isAdmin) return null;

  const ft = t.founderDashboard;

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="page-founder-dashboard">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Crown className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-founder-title">
              {ft.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-founder-subtitle">
            {ft.subtitle}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-md" />
            ))}
          </div>
        ) : data ? (
          <>
            <section>
              <SectionHeader title={ft.sectionUsers} color="blue" testId="text-section-users" />
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <ColoredMetricCard label={ft.totalUsers} value={data.users.total_users} icon={Users} color="blue" testId="metric-total-users" />
                <ColoredMetricCard label={ft.newUsers7d} value={data.users.new_users_7d} icon={UserPlus} color="blue" testId="metric-new-users" />
                <ColoredMetricCard label={ft.activeUsers24h} value={data.users.active_users_24h} icon={Activity} color="blue" testId="metric-active-24h" />
                <ColoredMetricCard label={ft.activeUsers7d} value={data.users.active_users_7d} icon={Activity} color="blue" testId="metric-active-7d" />
                <ColoredMetricCard label={ft.mau} value={data.users.monthly_active_users} icon={CalendarDays} color="blue" testId="metric-mau" />
                <ColoredMetricCard label={ft.dauMauRatio} value={formatPercent(data.users.dau_mau_ratio)} icon={Gauge} color="blue" testId="metric-dau-mau" />
                <ColoredMetricCard label={ft.returningRate} value={formatPercent(data.users.returning_users_rate)} icon={RefreshCw} color="blue" testId="metric-returning-rate" />
              </div>
            </section>

            <section>
              <SectionHeader title={ft.sectionUsage} color="green" testId="text-section-usage" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <ColoredMetricCard label={ft.sessionsToday} value={data.usage.sessions_today} icon={BarChart3} color="green" testId="metric-sessions-today" />
                <ColoredMetricCard label={ft.avgSessionDuration} value={formatDuration(data.usage.avg_session_duration)} icon={Clock} color="green" testId="metric-avg-session" />
                <ColoredMetricCard label={ft.scriptsGenerated} value={data.usage.scripts_generated} icon={FileText} color="green" testId="metric-scripts" />
                <ColoredMetricCard label={ft.projectsCreated} value={data.usage.projects_created} icon={FolderKanban} color="green" testId="metric-projects" />
                <ColoredMetricCard label={ft.patternsUsed} value={data.usage.patterns_used_in_create} icon={Layers} color="green" testId="metric-patterns-used" />
              </div>
            </section>

            <section>
              <SectionHeader title={ft.sectionRevenue} color="violet" testId="text-section-revenue" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <ColoredMetricCard label={ft.activeSubscriptions} value={data.revenue.active_subscriptions} icon={CreditCard} color="violet" testId="metric-active-subs" />
                <ColoredMetricCard label={ft.mrr} value={formatCurrency(data.revenue.mrr)} icon={DollarSign} color="violet" testId="metric-mrr" />
                <ColoredMetricCard label={ft.mrrGrowth30d} value={formatPercent(data.revenue.mrr_growth_30d)} icon={TrendingUp} color="violet" testId="metric-mrr-growth" />
                <ColoredMetricCard label={ft.arpu} value={formatCurrency(data.revenue.arpu)} icon={TrendingUp} color="violet" testId="metric-arpu" />
                <ColoredMetricCard label={ft.activeTrials} value={data.revenue.active_trials} icon={Hourglass} color="violet" testId="metric-active-trials" />
                <ColoredMetricCard label={ft.trialConversion} value={formatPercent(data.revenue.trial_to_paid_conversion_rate)} icon={ArrowUpRight} color="violet" testId="metric-trial-conversion" />
              </div>
            </section>

            <section>
              <SectionHeader title={ft.sectionEngine} color="orange" testId="text-section-engine" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <ColoredMetricCard label={ft.totalVideosAnalysed} value={data.engine.total_videos_analysed} icon={Video} color="orange" testId="metric-total-videos" />
                <ColoredMetricCard label={ft.videosIngestedToday} value={data.engine.videos_ingested_today} icon={Download} color="orange" testId="metric-ingested-today" />
                <ColoredMetricCard label={ft.videosClassifiedToday} value={data.engine.videos_classified_today} icon={CheckSquare} color="orange" testId="metric-classified-today" />
                <ColoredMetricCard label={ft.totalPatterns} value={data.engine.total_patterns_detected} icon={Sparkles} color="orange" testId="metric-total-patterns" />
                <ColoredMetricCard label={ft.patternsAbove70} value={data.engine.patterns_score_above_70} icon={Target} color="orange" testId="metric-patterns-70" />
                <ColoredMetricCard label={ft.patternReuseRate} value={formatPercent(data.engine.pattern_reuse_rate)} icon={Repeat} color="orange" testId="metric-reuse-rate" />
                <ColoredMetricCard label={ft.crossPlatformRate} value={formatPercent(data.engine.cross_platform_pattern_rate)} icon={Globe} color="orange" testId="metric-cross-platform" />
                <ColoredMetricCard label={ft.crossPlatformCount} value={data.engine.cross_platform_patterns_count} icon={Globe} color="orange" testId="metric-cross-platform-count" />
                <ColoredMetricCard label={ft.risingPatterns} value={data.engine.rising_patterns_count} icon={Flame} color="orange" testId="metric-rising-patterns" />
                <ColoredMetricCard label={ft.avgPatternScore} value={data.engine.average_pattern_score.toFixed(1)} icon={Award} color="orange" testId="metric-avg-pattern-score" />
              </div>
            </section>

            <section>
              <SectionHeader title="Dataset Health" color="green" testId="text-section-dataset-health" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ColoredMetricCard label="Total Videos" value={data.dataset_health.total_videos} icon={Video} color="green" testId="metric-ds-total-videos" />
                <ColoredMetricCard label="Classified" value={data.dataset_health.classified_videos} icon={CheckCircle} color="green" testId="metric-ds-classified" />
                <ColoredMetricCard label="Pending" value={data.dataset_health.pending_videos} icon={Clock} color="green" testId="metric-ds-pending" />
                <ColoredMetricCard label="Failed" value={data.dataset_health.failed_videos} icon={AlertTriangle} color="orange" testId="metric-ds-failed" />
                <ColoredMetricCard label="Videos Last 24h" value={data.dataset_health.videos_last_24h} icon={Download} color="green" testId="metric-ds-last-24h" />
                <ColoredMetricCard label="Creator Coverage" value={formatPercent(data.dataset_health.creator_coverage)} icon={Users} color="green" testId="metric-ds-creator-coverage" />
                <ColoredMetricCard label="Unknown Creators" value={formatPercent(data.dataset_health.unknown_creators)} icon={Users} color="orange" testId="metric-ds-unknown-creators" />
                <ColoredMetricCard label="Avg View Velocity" value={data.dataset_health.avg_view_velocity.toFixed(0)} icon={TrendingUp} color="green" testId="metric-ds-avg-velocity" />
              </div>
            </section>

            <section>
              <SectionHeader title="Pipeline Status" color="blue" testId="text-section-pipeline-status" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ColoredMetricCard label="Last Ingestion" value={formatTimeAgo(data.pipeline_status.last_ingestion_run)} icon={Download} color="blue" testId="metric-ps-last-ingestion" />
                <ColoredMetricCard label="Last Classification" value={formatTimeAgo(data.pipeline_status.last_classification_run)} icon={CheckSquare} color="blue" testId="metric-ps-last-classification" />
                <ColoredMetricCard label="Last Pattern Engine" value={formatTimeAgo(data.pipeline_status.last_pattern_engine_run)} icon={Cpu} color="blue" testId="metric-ps-last-pattern" />
              </div>
            </section>

            <section>
              <SectionHeader title={ft.sectionSystemHealth} color="gray" testId="text-section-system" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ColoredMetricCard label={ft.ingestionRunsToday} value={data.system_health.ingestion_runs_today} icon={Server} color="gray" testId="metric-ingestion-runs" />
                <ColoredMetricCard label={ft.classifierSuccessRate} value={formatPercent(data.system_health.classifier_success_rate)} icon={CheckCircle} color="gray" testId="metric-classifier-rate" />
                <ColoredMetricCard label={ft.patternEngineRuns} value={data.system_health.pattern_engine_runs} icon={Cpu} color="gray" testId="metric-pattern-engine" />
                <ColoredMetricCard label={ft.alertsTriggered} value={data.system_health.alerts_triggered} icon={Bell} color="gray" testId="metric-alerts" />
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader title={ft.engineIntelligence} color="orange" testId="text-section-engine-intelligence" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card data-testid="chart-dataset-growth">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-foreground mb-4" data-testid="text-chart-dataset-title">
                      {ft.datasetGrowth}
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.videos_over_time}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={axisTick} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={axisTick} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="chart-pattern-intelligence">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-foreground mb-4" data-testid="text-chart-patterns-title">
                      {ft.patternGrowth}
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.patterns_over_time}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={axisTick} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={axisTick} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="chart-pattern-reuse">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-foreground mb-4" data-testid="text-chart-reuse-title">
                      {ft.patternReuseOverTime}
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.charts.pattern_reuse_over_time}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={axisTick} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={axisTick} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Reuse Rate"]} />
                          <Line type="monotone" dataKey="rate" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="chart-cross-platform">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-foreground mb-4" data-testid="text-chart-crossplatform-title">
                      {ft.crossPlatformGrowth}
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.cross_platform_over_time}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={axisTick} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={axisTick} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Pipeline Real-Time Status */}
            {pipeline && (
              <section>
                <SectionHeader title="Pipeline Real-Time" color="blue" testId="text-section-pipeline-rt" />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  {/* Health indicator */}
                  <div className="col-span-2 md:col-span-5 flex items-center gap-2 mb-2">
                    {parseInt(pipeline.videos?.classified) > 1000 && pipeline.videos?.last_ingestion && (Date.now() - new Date(pipeline.videos.last_ingestion).getTime()) < 12 * 3600 * 1000 ? (
                      <span style={{ fontSize: 14, color: '#10b981', fontWeight: 600 }}>🟢 Pipeline healthy</span>
                    ) : (
                      <span style={{ fontSize: 14, color: '#ef4444', fontWeight: 600 }}>🔴 Pipeline needs attention</span>
                    )}
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      Last ingestion: {pipeline.videos?.last_ingestion ? new Date(pipeline.videos.last_ingestion).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  <ColoredMetricCard label="Classified" value={pipeline.videos?.classified || 0} icon={CheckCircle} color="green" testId="rt-classified" />
                  <ColoredMetricCard label="Pending" value={pipeline.videos?.pending || 0} icon={Clock} color="orange" testId="rt-pending" />
                  <ColoredMetricCard label="With hook_type_v2" value={pipeline.videos?.classified_v2 || 0} icon={Sparkles} color="violet" testId="rt-v2" />
                  <ColoredMetricCard label="Ingested 24h" value={pipeline.videos?.ingested_24h || 0} icon={Download} color="blue" testId="rt-24h" />
                  <ColoredMetricCard label="Ingested 7d" value={pipeline.videos?.ingested_7d || 0} icon={Download} color="blue" testId="rt-7d" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <ColoredMetricCard label="Total Clusters" value={pipeline.clusters?.total_clusters || 0} icon={Layers} color="violet" testId="rt-clusters" />
                  <ColoredMetricCard label="With Metadata" value={pipeline.clusters?.with_metadata || 0} icon={CheckSquare} color="green" testId="rt-clusters-meta" />
                  <ColoredMetricCard label="Emerging" value={pipeline.clusters?.emerging || 0} icon={Flame} color="orange" testId="rt-emerging" />
                  <ColoredMetricCard label="Trending" value={pipeline.clusters?.trending || 0} icon={TrendingUp} color="violet" testId="rt-trending" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ColoredMetricCard label="Total Patterns" value={pipeline.patterns?.total_patterns || 0} icon={Sparkles} color="orange" testId="rt-patterns" />
                  <ColoredMetricCard label="With Template" value={pipeline.patterns?.with_template || 0} icon={FileText} color="green" testId="rt-with-template" />
                  <ColoredMetricCard label="Phase Engine" value={pipeline.phase ? `Phase ${pipeline.phase.current_phase}` : 'Unknown'} icon={Cpu} color="blue" testId="rt-phase" />
                </div>
              </section>
            )}

            {/* ── Platform Health ── */}
            {platformHealth.length > 0 && (
              <section>
                <SectionHeader title="Platform Health" color="blue" testId="text-section-platform" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['tiktok', 'reels', 'shorts'].map(platform => {
                    const p = platformHealth.find((r: any) => r.platform === platform);
                    const isActive = p && parseInt(p.total_videos) > 0;
                    return (
                      <div key={platform} style={{
                        padding: '16px',
                        borderRadius: 12,
                        border: `1px solid ${isActive ? 'rgba(124,92,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        background: isActive ? 'rgba(124,92,255,0.04)' : 'rgba(255,255,255,0.02)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>
                              {platform === 'tiktok' ? '🎵' : platform === 'reels' ? '📸' : '▶️'}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{platform}</span>
                          </div>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            color: isActive ? '#22c55e' : 'rgba(255,255,255,0.3)',
                            textTransform: 'uppercase',
                          }}>
                            {isActive ? 'Active' : 'Pending'}
                          </span>
                        </div>
                        {p ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                              { label: 'Total videos', val: parseInt(p.total_videos).toLocaleString() },
                              { label: 'Classified', val: parseInt(p.classified).toLocaleString() },
                              { label: 'Last 24h', val: parseInt(p.ingested_24h).toLocaleString() },
                              { label: 'Avg virality', val: p.avg_virality ? `${p.avg_virality}/100` : '—' },
                            ].map(m => (
                              <div key={m.label}>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.val}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No data yet</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Onboarding Funnel ── */}
            {onboardingFunnel && (
              <section>
                <SectionHeader title="Onboarding Funnel" color="green" testId="text-section-onboarding" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <ColoredMetricCard label="Total Users" value={parseInt(onboardingFunnel.stats?.total_users) || 0} icon={Users} color="blue" testId="of-total" />
                  <ColoredMetricCard label="Onboarding Done" value={parseInt(onboardingFunnel.stats?.completed_onboarding) || 0} icon={CheckCircle} color="green" testId="of-completed" />
                  <ColoredMetricCard label="Pending Onboarding" value={parseInt(onboardingFunnel.stats?.pending_onboarding) || 0} icon={Clock} color="orange" testId="of-pending" />
                  <ColoredMetricCard
                    label="Conversion Rate"
                    value={onboardingFunnel.stats?.total_users > 0
                      ? `${Math.round((parseInt(onboardingFunnel.stats.completed_onboarding) / parseInt(onboardingFunnel.stats.total_users)) * 100)}%`
                      : '0%'}
                    icon={TrendingUp} color="violet" testId="of-rate" />
                </div>

                {onboardingFunnel.niches?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                        Niche distribution
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {onboardingFunnel.niches.map((n: any) => {
                          const max = parseInt(onboardingFunnel.niches[0].count) || 1;
                          const pct = Math.round((parseInt(n.count) / max) * 100);
                          return (
                            <div key={n.primary_niche}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>
                                  {(n.primary_niche || '').replace(/_/g, ' ')}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.35)' }}>{n.count}</span>
                              </div>
                              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#7C5CFF,#c026d3)', borderRadius: 2 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                        Active platform
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {onboardingFunnel.platforms?.map((p: any) => (
                          <div key={p.active_platform} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{p.active_platform || '—'}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>{p.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Studio → Results Funnel ── */}
            {studioFunnel && (
              <section>
                <SectionHeader title="Studio → Results Funnel" color="orange" testId="text-section-studio" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <ColoredMetricCard label="Briefs Generated" value={parseInt(studioFunnel.funnel?.total_entries) || 0} icon={FileText} color="orange" testId="sf-total" />
                  <ColoredMetricCard label="Awaiting Publish" value={parseInt(studioFunnel.funnel?.pending) || 0} icon={Clock} color="orange" testId="sf-pending" />
                  <ColoredMetricCard label="Published" value={parseInt(studioFunnel.funnel?.published) || 0} icon={CheckCircle} color="green" testId="sf-published" />
                  <ColoredMetricCard label="Tracked" value={parseInt(studioFunnel.funnel?.tracked) || 0} icon={TrendingUp} color="violet" testId="sf-tracked" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ColoredMetricCard label="Unique Users" value={parseInt(studioFunnel.funnel?.unique_users) || 0} icon={Users} color="blue" testId="sf-users" />
                  <ColoredMetricCard label="Patterns Used" value={parseInt(studioFunnel.funnel?.unique_patterns_used) || 0} icon={Sparkles} color="violet" testId="sf-patterns" />
                  <ColoredMetricCard label="Briefs Last 24h" value={parseInt(studioFunnel.funnel?.briefs_24h) || 0} icon={Activity} color="green" testId="sf-24h" />
                  <ColoredMetricCard label="Briefs Last 7d" value={parseInt(studioFunnel.funnel?.briefs_7d) || 0} icon={Activity} color="blue" testId="sf-7d" />
                </div>

                {studioFunnel.funnel?.total_entries > 0 && (
                  <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                      Loop completion rate (brief → tracked)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.round((parseInt(studioFunnel.funnel.tracked) / parseInt(studioFunnel.funnel.total_entries)) * 100)}%`,
                          background: 'linear-gradient(90deg,#7C5CFF,#22c55e)',
                          borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        {Math.round((parseInt(studioFunnel.funnel.tracked) / parseInt(studioFunnel.funnel.total_entries)) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Signal Health by Niche ── */}
            {signalHealth && signalHealth.byNiche?.length > 0 && (
              <section>
                <SectionHeader title="Signal Health by Niche" color="violet" testId="text-section-signal-health" />
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 80px 80px 80px 80px 100px', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <div>Niche</div>
                    <div style={{ textAlign: 'center' }}>Total</div>
                    <div style={{ textAlign: 'center', color: '#22c55e' }}>Strong</div>
                    <div style={{ textAlign: 'center', color: '#f59e0b' }}>Building</div>
                    <div style={{ textAlign: 'center', color: '#a78bfa' }}>Emerging</div>
                    <div style={{ textAlign: 'right' }}>Last update</div>
                  </div>
                  {signalHealth.byNiche.map((n: any) => {
                    const total = parseInt(n.total_patterns) || 0;
                    const strong = parseInt(n.strong) || 0;
                    const building = parseInt(n.building) || 0;
                    const emerging = parseInt(n.emerging) || 0;
                    const readiness = total > 0 ? Math.round(((strong * 3 + building * 2 + emerging) / (total * 3)) * 100) : 0;
                    const lastUpdated = n.last_updated ? Math.floor((Date.now() - new Date(n.last_updated).getTime()) / 3600000) : null;
                    return (
                      <div key={n.niche} style={{ display: 'grid', gridTemplateColumns: '160px 80px 80px 80px 80px 100px', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#fff', textTransform: 'capitalize', fontWeight: 500 }}>
                            {(n.niche || '').replace(/_/g, ' ')}
                          </div>
                          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${readiness}%`, height: '100%', background: readiness > 60 ? '#22c55e' : readiness > 30 ? '#f59e0b' : '#a78bfa', borderRadius: 2 }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{total}</div>
                        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: strong > 0 ? '#22c55e' : 'rgba(255,255,255,0.2)' }}>{strong}</div>
                        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: building > 0 ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}>{building}</div>
                        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: emerging > 0 ? '#a78bfa' : 'rgba(255,255,255,0.2)' }}>{emerging}</div>
                        <div style={{ textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                          {lastUpdated !== null ? (lastUpdated < 1 ? 'Just now' : lastUpdated < 24 ? `${lastUpdated}h ago` : `${Math.floor(lastUpdated / 24)}d ago`) : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6, fontStyle: 'italic' }}>
                  Readiness bar = weighted signal score (Strong ×3 / Building ×2 / Emerging ×1). Green = ready for beta.
                </div>
              </section>
            )}

            {/* Users Section */}
            {usersData && (
              <section>
                <SectionHeader title="Users (Real-time)" color="blue" testId="text-section-users-rt" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <ColoredMetricCard label="Total Users" value={parseInt(usersData.stats?.total_users) || 0} icon={Users} color="blue" testId="rt-total-users" />
                  <ColoredMetricCard label="Onboarded" value={parseInt(usersData.stats?.onboarded) || 0} icon={CheckCircle} color="green" testId="rt-onboarded" />
                  <ColoredMetricCard label="New (7d)" value={parseInt(usersData.stats?.new_7d) || 0} icon={UserPlus} color="violet" testId="rt-new-7d" />
                  <ColoredMetricCard label="New (24h)" value={parseInt(usersData.stats?.new_24h) || 0} icon={Activity} color="orange" testId="rt-new-24h" />
                </div>

                {/* Niche distribution */}
                {usersData.niches?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Niche Distribution</h3>
                    <div className="space-y-2">
                      {usersData.niches.map((n: any) => {
                        const max = parseInt(usersData.niches[0].count) || 1;
                        const pct = Math.round((parseInt(n.count) / max) * 100);
                        return (
                          <div key={n.primary_niche}>
                            <div className="flex justify-between mb-1 text-xs">
                              <span className="text-foreground capitalize">{(n.primary_niche || '').replace(/_/g, ' ')}</span>
                              <span className="text-muted-foreground">{n.count}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #7C5CFF, #c026d3)', borderRadius: 999 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* User list */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 60px 120px', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                    <div>Email</div><div>Niche</div><div>Done</div><div>Joined</div>
                  </div>
                  {(usersData.users || []).slice(0, 20).map((u: any) => (
                    <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 60px 120px', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, alignItems: 'center' }}>
                      <div style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{(u.primary_niche || '—').replace(/_/g, ' ')}</div>
                      <div style={{ color: u.onboarding_completed ? '#10b981' : '#f59e0b' }}>{u.onboarding_completed ? '✓' : '—'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{new Date(u.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Actions */}
            <section>
              <SectionHeader title="Quick Actions" color="orange" testId="text-section-actions" />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => actionMutation.mutate('force-clustering')}
                  disabled={actionMutation.isPending}
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  🔄 Force Clustering
                </button>
                <button
                  onClick={() => actionMutation.mutate('force-scoring')}
                  disabled={actionMutation.isPending}
                  style={{ background: 'rgba(124,92,255,0.15)', border: '1px solid #7C5CFF', color: '#7C5CFF', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  📊 Force Scoring
                </button>
                <button
                  onClick={() => actionMutation.mutate('force-velocity')}
                  disabled={actionMutation.isPending}
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  ⚡ Force Velocity
                </button>
              </div>
            </section>

            {/* Waitlist Management */}
            {waitlistData && (
              <section>
                <SectionHeader title="Waitlist" color="violet" testId="text-section-waitlist" />
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <ColoredMetricCard label="Total" value={parseInt(waitlistData.stats?.total) || 0} icon={Users} color="violet" testId="wl-total" />
                  <ColoredMetricCard label="Invited" value={parseInt(waitlistData.stats?.invited) || 0} icon={CheckCircle} color="green" testId="wl-invited" />
                  <ColoredMetricCard label="New (7d)" value={parseInt(waitlistData.stats?.new_7d) || 0} icon={UserPlus} color="blue" testId="wl-new-7d" />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                    <div>Email</div><div>Niche</div><div>Platform</div><div>Followers</div><div>Action</div>
                  </div>
                  {(waitlistData.entries || []).slice(0, 20).map((e: any) => (
                    <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, alignItems: 'center' }}>
                      <div style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.email}</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{(e.niche || '—').replace(/_/g, ' ')}</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)' }}>{e.platform || '—'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)' }}>{e.followers_range || '—'}</div>
                      <div>
                        {e.status === 'invited' ? (
                          <span style={{ fontSize: 11, color: '#10b981' }}>✓ Invited</span>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                await apiRequest("POST", `/api/admin/waitlist/${e.id}/invite`, {});
                                queryClient.invalidateQueries({ queryKey: ["/api/founder/waitlist"] });
                                toast({ title: `Invited ${e.email}` });
                              } catch {
                                toast({ title: "Invite failed", variant: "destructive" });
                              }
                            }}
                            style={{ background: '#7C5CFF', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-10 text-center">
              <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{ft.noData}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
