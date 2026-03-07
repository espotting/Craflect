import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
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
  Percent,
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
  AlertTriangle,
  Cpu,
  Bell,
  Crown,
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
    arpu: number;
    active_trials: number;
    trial_to_paid_conversion_rate: number;
  };
  engine: {
    total_videos_analysed: number;
    total_patterns_detected: number;
    patterns_score_above_70: number;
    pattern_reuse_rate: number;
    cross_platform_pattern_rate: number;
    rising_patterns_count: number;
    average_pattern_score: number;
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
  return `${(val * 100).toFixed(1)}%`;
}

function formatCurrency(val: number): string {
  return `$${val.toFixed(0)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  return `${minutes.toFixed(0)}m`;
}

export default function FounderDashboard() {
  const { t } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !(user as any)?.isAdmin) {
      setLocation("/dashboard");
    }
  }, [authLoading, user, setLocation]);

  const { data, isLoading } = useQuery<FounderMetrics>({
    queryKey: ["/api/admin/founder"],
    enabled: !!(user as any)?.isAdmin,
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
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-md" />
            ))}
          </div>
        ) : data ? (
          <>
            <section>
              <SectionHeader title={ft.sectionUsers} color="blue" testId="text-section-users" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <ColoredMetricCard label={ft.totalUsers} value={data.users.total_users} icon={Users} color="blue" testId="metric-total-users" />
                <ColoredMetricCard label={ft.newUsers7d} value={data.users.new_users_7d} icon={UserPlus} color="blue" testId="metric-new-users" />
                <ColoredMetricCard label={ft.activeUsers24h} value={data.users.active_users_24h} icon={Activity} color="blue" testId="metric-active-24h" />
                <ColoredMetricCard label={ft.activeUsers7d} value={data.users.active_users_7d} icon={Activity} color="blue" testId="metric-active-7d" />
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <ColoredMetricCard label={ft.activeSubscriptions} value={data.revenue.active_subscriptions} icon={CreditCard} color="violet" testId="metric-active-subs" />
                <ColoredMetricCard label={ft.mrr} value={formatCurrency(data.revenue.mrr)} icon={DollarSign} color="violet" testId="metric-mrr" />
                <ColoredMetricCard label={ft.arpu} value={formatCurrency(data.revenue.arpu)} icon={TrendingUp} color="violet" testId="metric-arpu" />
                <ColoredMetricCard label={ft.activeTrials} value={data.revenue.active_trials} icon={Hourglass} color="violet" testId="metric-active-trials" />
                <ColoredMetricCard label={ft.trialConversion} value={formatPercent(data.revenue.trial_to_paid_conversion_rate)} icon={ArrowUpRight} color="violet" testId="metric-trial-conversion" />
              </div>
            </section>

            <section>
              <SectionHeader title={ft.sectionEngine} color="orange" testId="text-section-engine" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <ColoredMetricCard label={ft.totalVideosAnalysed} value={data.engine.total_videos_analysed} icon={Video} color="orange" testId="metric-total-videos" />
                <ColoredMetricCard label={ft.totalPatterns} value={data.engine.total_patterns_detected} icon={Sparkles} color="orange" testId="metric-total-patterns" />
                <ColoredMetricCard label={ft.patternsAbove70} value={data.engine.patterns_score_above_70} icon={Target} color="orange" testId="metric-patterns-70" />
                <ColoredMetricCard label={ft.patternReuseRate} value={formatPercent(data.engine.pattern_reuse_rate)} icon={Repeat} color="orange" testId="metric-reuse-rate" />
                <ColoredMetricCard label={ft.crossPlatformRate} value={formatPercent(data.engine.cross_platform_pattern_rate)} icon={Globe} color="orange" testId="metric-cross-platform" />
                <ColoredMetricCard label={ft.risingPatterns} value={data.engine.rising_patterns_count} icon={Flame} color="orange" testId="metric-rising-patterns" />
                <ColoredMetricCard label={ft.avgPatternScore} value={data.engine.average_pattern_score.toFixed(1)} icon={Award} color="orange" testId="metric-avg-pattern-score" />
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

            <section className="space-y-6">
              <SectionHeader title={ft.charts} color="blue" testId="text-section-charts" />

              <Card data-testid="chart-dataset-growth">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4" data-testid="text-chart-dataset-title">
                    {ft.datasetGrowth}
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.charts.videos_over_time}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
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
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
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
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Reuse Rate"]}
                        />
                        <Line type="monotone" dataKey="rate" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </section>
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
