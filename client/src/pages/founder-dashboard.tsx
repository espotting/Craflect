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
