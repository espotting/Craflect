import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Video,
  Zap,
  TrendingUp,
  Activity,
  Sparkles,
  FileText,
  Eye,
  Bookmark,
  Flame,
  ArrowUpRight,
  Layers,
  BarChart3,
  Clock,
  Radio,
  User,
  Target,
  AlertTriangle,
} from "lucide-react";
import { AnimatedEmptyState } from "@/components/animated-empty-state";

interface Opportunity {
  hook: string;
  format: string;
  topic: string;
  hook_mechanism: string | null;
  opportunity_score: number;
  velocity: number;
  videos_detected: number;
  avg_engagement: number;
  total_views: number;
}

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
  top_videos: Array<{
    id: string;
    caption: string;
    platform: string;
    creator_name: string;
    views: number;
    likes: number;
    comments: number;
    engagement_rate: number;
    virality_score: number;
    topic_cluster: string;
    structure_type: string;
    hook_mechanism_primary: string;
    classified_at: string;
  }>;
  emerging_trends: Array<{
    topic_cluster: string;
    hook_mechanism_primary: string;
    structure_type: string;
    video_count: string;
    avg_virality: string;
    latest_at: string;
  }>;
}

function getOpportunityColor(score: number) {
  if (score >= 80) return { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" };
  if (score >= 60) return { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" };
  return { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" };
}

function getOpportunityLabel(score: number, t: any) {
  if (score >= 80) return t.dashboard.high;
  if (score >= 60) return t.dashboard.medium;
  return t.dashboard.low;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function MetricCard({
  label,
  value,
  icon: Icon,
  testId,
}: {
  label: string;
  value: number | string;
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
          </div>
          <div className="flex-shrink-0 w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityCard({
  opportunity,
  index,
  t,
}: {
  opportunity: Opportunity;
  index: number;
  t: any;
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const colors = getOpportunityColor(opportunity.opportunity_score);
  const label = getOpportunityLabel(opportunity.opportunity_score, t);

  const saveIdeaMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/ideas/save", {
        hook: opportunity.hook,
        format: opportunity.format,
        topic: opportunity.topic,
        opportunityScore: opportunity.opportunity_score,
        velocity: opportunity.velocity,
        videosDetected: opportunity.videos_detected,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({ title: t.dashboard.savedIdea });
    },
  });

  const topicLabel = TOPIC_CLUSTER_LABELS[opportunity.topic] || opportunity.topic?.replace(/_/g, " ") || "—";

  return (
    <Card data-testid={`card-opportunity-${index}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-foreground leading-snug line-clamp-2" data-testid={`text-opportunity-hook-${index}`}>
              {opportunity.hook || "—"}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]" data-testid={`badge-opportunity-format-${index}`}>
                {opportunity.format?.replace(/_/g, " ") || "—"}
              </Badge>
              <Badge variant="secondary" className="text-[10px]" data-testid={`badge-opportunity-topic-${index}`}>
                {topicLabel}
              </Badge>
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div
              className={`w-12 h-12 rounded-md flex items-center justify-center font-bold text-lg ring-1 ${colors.bg} ${colors.text} ${colors.border}`}
              data-testid={`score-opportunity-${index}`}
            >
              {opportunity.opportunity_score}
            </div>
            <span className={`text-[10px] font-medium ${colors.text}`}>{label}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {opportunity.velocity?.toFixed(0) || 0} {t.dashboard.velocity.toLowerCase()}
          </span>
          <span className="flex items-center gap-1">
            <Video className="w-3 h-3" />
            {opportunity.videos_detected} {t.dashboard.videosDetected}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setLocation(`/script-generator?hook=${encodeURIComponent(opportunity.hook)}&format=${encodeURIComponent(opportunity.format)}&topic=${encodeURIComponent(opportunity.topic)}`)}
            data-testid={`button-opportunity-script-${index}`}
          >
            <FileText className="w-3 h-3 mr-1" />
            {t.dashboard.createScript}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setLocation(`/video-builder?hook=${encodeURIComponent(opportunity.hook)}&format=${encodeURIComponent(opportunity.format)}&topic=${encodeURIComponent(opportunity.topic)}`)}
            data-testid={`button-opportunity-video-${index}`}
          >
            <Video className="w-3 h-3 mr-1" />
            {t.dashboard.createVideo}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => saveIdeaMutation.mutate()}
            disabled={saveIdeaMutation.isPending}
            data-testid={`button-opportunity-save-${index}`}
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getVelocityIndicator(virality: number) {
  if (virality >= 3) return { label: "Rising", color: "text-emerald-500", icon: "↑" };
  if (virality >= 1.5) return { label: "Stable", color: "text-zinc-400", icon: "→" };
  return { label: "Declining", color: "text-red-400", icon: "↓" };
}

function TrendCard({
  trend,
  index,
  t,
}: {
  trend: RadarData["emerging_trends"][0];
  index: number;
  t: any;
}) {
  const [, setLocation] = useLocation();
  const topicLabel = TOPIC_CLUSTER_LABELS[trend.topic_cluster] || trend.topic_cluster?.replace(/_/g, " ") || "—";
  const virality = parseFloat(trend.avg_virality) || 0;
  const velocity = getVelocityIndicator(virality);

  return (
    <Card className="hover-elevate" data-testid={`card-trend-${index}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 min-w-0 flex-1">
            <Badge variant="secondary" className="text-[10px]" data-testid={`badge-trend-topic-${index}`}>
              {topicLabel}
            </Badge>
            <div className="flex items-center gap-2 flex-wrap">
              {trend.hook_mechanism_primary && (
                <Badge variant="outline" className="text-[10px]">
                  {trend.hook_mechanism_primary.replace(/_/g, " ")}
                </Badge>
              )}
              {trend.structure_type && (
                <Badge variant="outline" className="text-[10px]">
                  {trend.structure_type.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-sm font-bold text-emerald-500" data-testid={`text-trend-virality-${index}`}>
                {virality.toFixed(1)}
              </span>
            </div>
            <span className={`text-[10px] font-medium ${velocity.color}`} data-testid={`text-trend-velocity-${index}`}>
              {velocity.icon} {velocity.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Video className="w-3 h-3" />
            {trend.video_count} videos
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setLocation(`/script-generator?hook=${encodeURIComponent(trend.hook_mechanism_primary || "")}&format=${encodeURIComponent(trend.structure_type || "")}&topic=${encodeURIComponent(trend.topic_cluster || "")}`)}
            data-testid={`button-trend-script-${index}`}
          >
            <FileText className="w-3 h-3 mr-1" />
            {t.dashboard.createScript}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setLocation(`/video-builder?hook=${encodeURIComponent(trend.hook_mechanism_primary || "")}&format=${encodeURIComponent(trend.structure_type || "")}&topic=${encodeURIComponent(trend.topic_cluster || "")}`)}
            data-testid={`button-trend-video-${index}`}
          >
            <Video className="w-3 h-3 mr-1" />
            {t.dashboard.createVideo}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VideoCard({
  video,
  index,
  t,
}: {
  video: RadarData["top_videos"][0];
  index: number;
  t: any;
}) {
  const [, setLocation] = useLocation();
  const engagement = (video.engagement_rate || 0) * 100;
  const virality = video.virality_score || 0;

  return (
    <div
      className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0"
      data-testid={`row-video-${index}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-bold text-primary">{index + 1}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm text-foreground leading-snug line-clamp-2" data-testid={`text-video-caption-${index}`}>
          {video.caption || "—"}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {video.creator_name && (
            <span data-testid={`text-video-creator-${index}`}>@{video.creator_name}</span>
          )}
          {video.platform && (
            <Badge variant="outline" className="text-[10px]">{video.platform}</Badge>
          )}
          <span className="flex items-center gap-1" data-testid={`text-video-views-${index}`}>
            <Eye className="w-3 h-3" />
            {formatNumber(video.views || 0)} {t.dashboard.views}
          </span>
          <span data-testid={`text-video-engagement-${index}`}>
            {engagement.toFixed(1)}% {t.dashboard.engagement}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {video.topic_cluster && (
            <Badge variant="secondary" className="text-[10px]">
              {TOPIC_CLUSTER_LABELS[video.topic_cluster] || video.topic_cluster.replace(/_/g, " ")}
            </Badge>
          )}
          {virality > 0 && (
            <span className="text-xs font-mono text-emerald-500" data-testid={`text-video-virality-${index}`}>
              {virality.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 flex flex-col gap-1">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setLocation(`/script-generator?hook=${encodeURIComponent(video.hook_mechanism_primary || "")}&format=${encodeURIComponent(video.structure_type || "")}&topic=${encodeURIComponent(video.topic_cluster || "")}`)}
          data-testid={`button-video-script-${index}`}
        >
          <FileText className="w-3 h-3 mr-1" />
          {t.dashboard.createScript}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setLocation(`/video-builder?hook=${encodeURIComponent(video.hook_mechanism_primary || "")}&format=${encodeURIComponent(video.structure_type || "")}&topic=${encodeURIComponent(video.topic_cluster || "")}`)}
          data-testid={`button-video-create-${index}`}
        >
          <Video className="w-3 h-3 mr-1" />
          {t.dashboard.createVideo}
        </Button>
      </div>
    </div>
  );
}

function EmptySection({
  icon: Icon,
  title,
  description,
  testId,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  testId: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10" data-testid={testId}>
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground/70 max-w-xs text-center">{description}</p>
    </div>
  );
}

function FreshnessIndicator({ trends, t }: { trends: EmergingTrend[]; t: any }) {
  const latestTimestamp = trends.reduce((latest, trend) => {
    const ts = trend.latest_at ? new Date(trend.latest_at).getTime() : 0;
    return ts > latest ? ts : latest;
  }, 0);

  if (!latestTimestamp) return null;

  const now = Date.now();
  const diffMs = now - latestTimestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  let timeText: string;
  if (diffMinutes < 1) {
    timeText = t.dashboard.justNow;
  } else if (diffMinutes < 60) {
    timeText = `${t.dashboard.updatedAgo} ${diffMinutes} ${t.dashboard.minutesAgo}`;
  } else {
    timeText = `${t.dashboard.updatedAgo} ${diffHours} ${t.dashboard.hoursAgo}`;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-freshness-indicator">
      <Clock className="w-3 h-3" />
      <span>{timeText}</span>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: radarData, isLoading: radarLoading } = useQuery<RadarData>({
    queryKey: ["/api/trends/radar"],
  });

  const { data: opportunityData, isLoading: oppLoading } = useQuery<{ opportunities: Opportunity[] }>({
    queryKey: ["/api/opportunities/engine"],
  });

  const { data: feedEvents } = useQuery<Array<{
    id: number;
    eventType: string;
    title: string;
    description: string | null;
    metadata: any;
    createdAt: string;
  }>>({
    queryKey: ["/api/intelligence/feed"],
    refetchInterval: 60000,
  });

  const isLoading = radarLoading || oppLoading;
  const metrics = radarData?.metrics;
  const opportunities = opportunityData?.opportunities || [];
  const trends = radarData?.emerging_trends || [];
  const topVideos = radarData?.top_videos || [];

  const highVelocityCount = topVideos.filter((v) => (v.virality_score || 0) >= 3).length;
  const patternsCount =
    (radarData?.trending_hooks?.length || 0) +
    (radarData?.trending_formats?.length || 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-md" />
            <Skeleton className="h-28 rounded-md" />
            <Skeleton className="h-28 rounded-md" />
            <Skeleton className="h-28 rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-56 rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Skeleton className="h-48 rounded-md" />
              <Skeleton className="h-48 rounded-md" />
              <Skeleton className="h-48 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-md" />
            <Skeleton className="h-64 rounded-md" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const hasNoData = !metrics?.total_videos && opportunities.length === 0 && topVideos.length === 0 && trends.length === 0;

  if (hasNoData && !(feedEvents && feedEvents.length > 0)) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
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
          <Card>
            <CardContent className="p-0">
              <AnimatedEmptyState />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label={t.dashboard.videosAnalyzedToday}
            value={metrics?.videos_today || 0}
            icon={Video}
            testId="card-metric-videos-today"
          />
          <MetricCard
            label={t.dashboard.emergingTrends}
            value={trends.length}
            icon={TrendingUp}
            testId="card-metric-trends"
          />
          <MetricCard
            label={t.dashboard.highVelocityVideos}
            value={highVelocityCount}
            icon={Flame}
            testId="card-metric-velocity"
          />
          <MetricCard
            label={t.dashboard.newViralPatterns}
            value={patternsCount}
            icon={Layers}
            testId="card-metric-patterns"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground" data-testid="text-section-playbook">
              {t.dashboard.viralPlaybook}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-widest text-primary" data-testid="text-section-opportunities">
                {t.dashboard.viralOpportunities}
              </span>
              <FreshnessIndicator trends={trends} t={t} />
            </div>
          </div>
          {opportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {opportunities.slice(0, 5).map((opp, i) => (
                <OpportunityCard key={i} opportunity={opp} index={i} t={t} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptySection
                  icon={Zap}
                  title={t.dashboard.noOpportunities}
                  description={t.dashboard.noOpportunitiesDesc}
                  testId="empty-opportunities"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary" data-testid="text-section-trends">
              {t.dashboard.fastestGrowingTrends}
            </h2>
          </div>
          {trends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {trends.slice(0, 6).map((trend, i) => (
                <TrendCard key={i} trend={trend} index={i} t={t} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptySection
                  icon={TrendingUp}
                  title={t.dashboard.noTrends}
                  description={t.dashboard.noTrendsDesc}
                  testId="empty-trends"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary" data-testid="text-section-top-videos">
              {t.dashboard.topViralVideos}
            </h2>
          </div>
          {topVideos.length > 0 ? (
            <Card>
              <CardContent className="p-5">
                {topVideos.slice(0, 5).map((video, i) => (
                  <VideoCard key={video.id || i} video={video} index={i} t={t} />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptySection
                  icon={BarChart3}
                  title={t.dashboard.noVideos}
                  description={t.dashboard.noVideosDesc}
                  testId="empty-videos"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary" data-testid="text-section-intelligence-feed">
              {t.dashboard.intelligenceFeed}
            </h2>
          </div>
          {feedEvents && feedEvents.length > 0 ? (
            <Card>
              <CardContent className="p-5 space-y-3">
                {feedEvents.slice(0, 10).map((event) => {
                  const iconMap: Record<string, React.ElementType> = {
                    VIRAL_VIDEO_DETECTED: Flame,
                    NEW_CREATOR_DETECTED: User,
                    PATTERN_DETECTED: Layers,
                    TREND_ACCELERATING: TrendingUp,
                    TREND_DECLINING: AlertTriangle,
                    OPPORTUNITY_CREATED: Target,
                  };
                  const colorMap: Record<string, string> = {
                    VIRAL_VIDEO_DETECTED: "text-orange-400",
                    NEW_CREATOR_DETECTED: "text-blue-400",
                    PATTERN_DETECTED: "text-violet-400",
                    TREND_ACCELERATING: "text-emerald-400",
                    TREND_DECLINING: "text-red-400",
                    OPPORTUNITY_CREATED: "text-yellow-400",
                  };
                  const labelMap: Record<string, string> = {
                    VIRAL_VIDEO_DETECTED: t.dashboard.eventViralVideo,
                    NEW_CREATOR_DETECTED: t.dashboard.eventNewCreator,
                    PATTERN_DETECTED: t.dashboard.eventPatternDetected,
                    TREND_ACCELERATING: t.dashboard.eventTrendAccelerating,
                    TREND_DECLINING: t.dashboard.eventTrendDeclining,
                    OPPORTUNITY_CREATED: t.dashboard.eventOpportunity,
                  };
                  const EvIcon = iconMap[event.eventType] || Sparkles;
                  const evColor = colorMap[event.eventType] || "text-primary";
                  const evLabel = labelMap[event.eventType] || event.eventType;

                  const ago = (() => {
                    const diff = Date.now() - new Date(event.createdAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return t.dashboard.justNow;
                    if (mins < 60) return t.dashboard.minutesAgo.replace("{n}", String(mins));
                    const hours = Math.floor(mins / 60);
                    if (hours < 24) return t.dashboard.hoursAgo.replace("{n}", String(hours));
                    return t.dashboard.daysAgo.replace("{n}", String(Math.floor(hours / 24)));
                  })();

                  return (
                    <div key={event.id} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0" data-testid={`feed-event-${event.id}`}>
                      <div className={`mt-0.5 ${evColor}`}>
                        <EvIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className={`text-[9px] ${evColor} border-current/30`}>{evLabel}</Badge>
                          <span className="text-[10px] text-muted-foreground">{ago}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptySection
                  icon={Radio}
                  title={t.dashboard.noFeedEvents}
                  description={t.dashboard.noFeedEventsDesc}
                  testId="empty-feed"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
