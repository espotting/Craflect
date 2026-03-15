import { KPICard } from './KPICard';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Database, Activity, Users, Zap, FlaskConical, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface FounderData {
  engine: {
    total_videos_analysed: number;
    videos_ingested_today: number;
    videos_classified_today: number;
    total_patterns_detected: number;
    patterns_score_above_70: number;
    pattern_reuse_rate: number;
    average_pattern_score: number;
  };
  dataset_health: {
    total_videos: number;
    classified_videos: number;
    pending_videos: number;
    failed_videos: number;
    videos_last_24h: number;
    creator_coverage: number;
    avg_view_velocity: number;
    reproducible_patterns: number;
    total_analyzed_clusters: number;
    reproducibility_rate: number;
  };
  charts: {
    videos_over_time: { date: string; count: number }[];
  };
}

export function PlatformHealthSection() {
  const { data } = useQuery<FounderData>({
    queryKey: ["/api/admin/founder"],
  });

  const engine = data?.engine;
  const health = data?.dataset_health;
  const chartData = data?.charts?.videos_over_time?.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    videos: d.count,
  })) || [];

  const classifiedPct = health && health.total_videos > 0
    ? `${((health.classified_videos / health.total_videos) * 100).toFixed(1)}% of dataset`
    : undefined;

  const classifierRate = health
    ? (health.classified_videos + health.failed_videos) > 0
      ? `${((health.classified_videos / (health.classified_videos + health.failed_videos)) * 100).toFixed(1)}%`
      : '0%'
    : '—';

  const reproducibilityPct = health?.reproducibility_rate != null
    ? `${(health.reproducibility_rate * 100).toFixed(1)}%`
    : '—';

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Platform Health</h2>
          <p className="text-sm text-muted-foreground">Data engine performance & dataset status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Videos in Dataset"
          value={health?.total_videos?.toLocaleString() ?? '—'}
          icon={<Database className="w-5 h-5" />}
          data-testid="kpi-total-videos"
        />
        <KPICard
          title="Videos Ingested (24h)"
          value={health?.videos_last_24h?.toLocaleString() ?? '—'}
          icon={<Activity className="w-5 h-5" />}
          data-testid="kpi-videos-24h"
        />
        <KPICard
          title="Videos Classified"
          value={health?.classified_videos?.toLocaleString() ?? '—'}
          subtitle={classifiedPct}
          status="healthy"
          icon={<Zap className="w-5 h-5" />}
          data-testid="kpi-videos-classified"
        />
        <KPICard
          title="Classification Success Rate"
          value={classifierRate}
          status="healthy"
          data-testid="kpi-classifier-rate"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Unique Creators Detected"
          value={health ? `${((health.creator_coverage || 0) * (health.classified_videos || 0)).toLocaleString()}` : '—'}
          icon={<Users className="w-5 h-5" />}
          data-testid="kpi-unique-creators"
        />
        <KPICard
          title="Patterns Detected"
          value={engine?.total_patterns_detected?.toLocaleString() ?? '—'}
          icon={<Target className="w-5 h-5" />}
          data-testid="kpi-patterns-detected"
        />
        <KPICard
          title="Reproducible Patterns"
          value={health?.reproducible_patterns?.toLocaleString() ?? '0'}
          subtitle={`of ${health?.total_analyzed_clusters?.toLocaleString() ?? '0'} analyzed clusters`}
          status={health && health.reproducible_patterns > 0 ? 'healthy' : 'neutral'}
          icon={<FlaskConical className="w-5 h-5" />}
          data-testid="kpi-reproducible-patterns"
        />
        <KPICard
          title="Reproducibility Rate"
          value={reproducibilityPct}
          subtitle="Videos ≥ 6, Creators ≥ 3, Niches ≥ 2"
          status={
            health?.reproducibility_rate != null
              ? health.reproducibility_rate >= 0.5 ? 'healthy'
              : health.reproducibility_rate >= 0.25 ? 'warning'
              : 'critical'
              : 'neutral'
          }
          icon={<FlaskConical className="w-5 h-5" />}
          data-testid="kpi-reproducibility-rate"
        />
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Video Ingestion</h3>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-violet-500 rounded-full" />
            <span className="text-sm text-muted-foreground">Videos ingested</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
              <Line type="monotone" dataKey="videos" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}
