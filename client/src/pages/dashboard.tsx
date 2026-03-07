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
  ArrowRight,
  Layers,
  BarChart3,
  Clock,
  Radio,
  User,
  Target,
  AlertTriangle,
  Play,
  ChevronLeft,
  ChevronRight,
  Hash,
} from "lucide-react";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { useRef } from "react";

interface DashboardData {
  trending_videos: Array<{
    id: string;
    caption: string;
    views: number;
    virality_score: number;
    view_velocity: number;
    thumbnail_url: string | null;
    hook_text: string | null;
    hook_mechanism_primary: string | null;
    structure_type: string | null;
    topic_cluster: string | null;
    platform: string | null;
    creator_name: string | null;
    likes: number;
    comments: number;
    classified_at: string;
  }>;
  daily_viral_play: {
    pattern_id: string;
    hook_type: string | null;
    structure_type: string | null;
    topic_cluster: string | null;
    pattern_score: number;
    video_count: number;
    pattern_label: string | null;
    velocity_mid: number | null;
    pattern_novelty: number | null;
    trend_classification: string | null;
    example_hook: string | null;
    reasoning: string;
  } | null;
  top_patterns: Array<{
    pattern_id: string;
    hook_type: string | null;
    structure_type: string | null;
    topic_cluster: string | null;
    avg_virality_score: number;
    video_count: number;
    pattern_label: string | null;
    performance_rank: number | null;
    pattern_score: number | null;
    velocity_mid: number | null;
    pattern_novelty: number | null;
    trend_classification: string | null;
  }>;
  top_hooks: Array<{
    hook_text: string;
    hook_mechanism_primary: string | null;
    count: string;
    avg_virality: string | null;
  }>;
  top_formats: Array<{
    structure_type: string;
    count: string;
    avg_virality: string | null;
  }>;
  alerts: Array<{
    id: number;
    eventType: string;
    title: string;
    description: string | null;
    metadata: any;
    createdAt: string;
  }>;
}

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
  if (virality >= 3) return { label: "Rising", color: "text-emerald-500", icon: "+" };
  if (virality >= 1.5) return { label: "Stable", color: "text-zinc-400", icon: "~" };
  return { label: "Declining", color: "text-red-400", icon: "-" };
}

function getTrendBadge(classification: string | null) {
  switch (classification) {
    case "rising": return { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Rising" };
    case "stable": return { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", label: "Stable" };
    case "declining": return { color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", label: "Declining" };
    default: return { color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", label: classification || "—" };
  }
}

type EmergingTrend = RadarData["emerging_trends"][0];

function TrendCard({
  trend,
  index,
  t,
}: {
  trend: EmergingTrend;
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

function DailyViralPlayCard({ play, t }: { play: DashboardData["daily_viral_play"]; t: any }) {
  const [, setLocation] = useLocation();
  if (!play) return null;

  const topicLabel = play.topic_cluster
    ? TOPIC_CLUSTER_LABELS[play.topic_cluster] || play.topic_cluster.replace(/_/g, " ")
    : "—";

  return (
    <Card className="ring-1 ring-primary/40 bg-primary/5" data-testid="card-daily-viral-play">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground" data-testid="text-daily-play-title">
              {t.dashboard.dailyViralPlay}
            </h3>
            <p className="text-[10px] text-muted-foreground">{t.dashboard.dailyViralPlayDesc}</p>
          </div>
        </div>

        <div className="space-y-2">
          {play.example_hook && (
            <p className="text-sm text-foreground italic leading-snug" data-testid="text-daily-play-hook">
              "{play.example_hook}"
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {play.hook_type && (
              <Badge variant="outline" className="text-[10px]" data-testid="badge-daily-play-hook-type">
                {play.hook_type.replace(/_/g, " ")}
              </Badge>
            )}
            {play.structure_type && (
              <Badge variant="outline" className="text-[10px]" data-testid="badge-daily-play-format">
                {play.structure_type.replace(/_/g, " ")}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-daily-play-topic">
              {topicLabel}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" data-testid="text-daily-play-score">
            <Target className="w-3 h-3" />
            {t.dashboard.patternScore}: {Math.round(play.pattern_score)}
          </span>
          <span className="flex items-center gap-1" data-testid="text-daily-play-videos">
            <Video className="w-3 h-3" />
            {play.video_count} {t.dashboard.videosDetected}
          </span>
          {play.velocity_mid != null && (
            <span className="flex items-center gap-1" data-testid="text-daily-play-velocity">
              <TrendingUp className="w-3 h-3" />
              {play.velocity_mid.toFixed(1)}
            </span>
          )}
        </div>

        {play.reasoning && (
          <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-daily-play-reasoning">
            {play.reasoning}
          </p>
        )}

        <Button
          variant="default"
          size="sm"
          className="w-full text-xs"
          onClick={() => setLocation(`/create?hook=${encodeURIComponent(play.hook_type || "")}&format=${encodeURIComponent(play.structure_type || "")}&topic=${encodeURIComponent(play.topic_cluster || "")}`)}
          data-testid="button-daily-play-create"
        >
          <Play className="w-3 h-3 mr-1" />
          {t.dashboard.createWithPlay}
        </Button>
      </CardContent>
    </Card>
  );
}

function TrendingVideosCarousel({ videos, t }: { videos: DashboardData["trending_videos"]; t: any }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 280;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      });
    }
  };

  if (videos.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="section-trending-carousel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary" data-testid="text-section-trending-videos">
            {t.dashboard.trendingVideos}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("left")}
            data-testid="button-carousel-left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("right")}
            data-testid="button-carousel-right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        {videos.map((video, i) => {
          const virality = video.virality_score || 0;
          return (
            <Card
              key={video.id || i}
              className="flex-shrink-0 w-[260px] hover-elevate"
              data-testid={`card-trending-video-${i}`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="w-full h-24 rounded-md bg-muted/30 flex items-center justify-center">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover rounded-md"
                      data-testid={`img-trending-thumb-${i}`}
                    />
                  ) : (
                    <Video className="w-8 h-8 text-muted-foreground/30" />
                  )}
                </div>

                <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug" data-testid={`text-trending-caption-${i}`}>
                  {video.caption || "—"}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1" data-testid={`text-trending-views-${i}`}>
                    <Eye className="w-3 h-3" />
                    {formatNumber(video.views || 0)}
                  </span>
                  {virality > 0 && (
                    <Badge variant="secondary" className="text-[10px]" data-testid={`badge-trending-virality-${i}`}>
                      {virality.toFixed(1)}
                    </Badge>
                  )}
                  {video.platform && (
                    <Badge variant="outline" className="text-[10px]" data-testid={`badge-trending-platform-${i}`}>
                      {video.platform}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TopHooksLeaderboard({ hooks, t }: { hooks: DashboardData["top_hooks"]; t: any }) {
  if (hooks.length === 0) return null;

  const maxCount = Math.max(...hooks.map((h) => parseInt(h.count) || 1));

  return (
    <Card data-testid="card-top-hooks">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Hash className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground" data-testid="text-section-top-hooks">
            {t.dashboard.topHooksLeaderboard}
          </h3>
        </div>

        {hooks.map((hook, i) => {
          const count = parseInt(hook.count) || 0;
          const virality = parseFloat(hook.avg_virality || "0");
          const barWidth = Math.max((count / maxCount) * 100, 8);

          return (
            <div key={i} className="space-y-1" data-testid={`row-top-hook-${i}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary w-5 text-right">#{i + 1}</span>
                <p className="text-xs text-foreground flex-1 line-clamp-1" data-testid={`text-hook-text-${i}`}>
                  {hook.hook_text}
                </p>
                {hook.hook_mechanism_primary && (
                  <Badge variant="outline" className="text-[9px] flex-shrink-0">
                    {hook.hook_mechanism_primary.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 pl-7">
                <div className="flex-1 h-1.5 bg-muted/50 rounded-full">
                  <div
                    className="h-full bg-primary/60 rounded-full"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right">{count}</span>
                {virality > 0 && (
                  <span className="text-[10px] text-emerald-500 font-mono w-8 text-right">{virality.toFixed(1)}</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TopFormatsLeaderboard({ formats, t }: { formats: DashboardData["top_formats"]; t: any }) {
  if (formats.length === 0) return null;

  const maxCount = Math.max(...formats.map((f) => parseInt(f.count) || 1));

  return (
    <Card data-testid="card-top-formats">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground" data-testid="text-section-top-formats">
            {t.dashboard.topFormatsLeaderboard}
          </h3>
        </div>

        {formats.map((format, i) => {
          const count = parseInt(format.count) || 0;
          const virality = parseFloat(format.avg_virality || "0");
          const barWidth = Math.max((count / maxCount) * 100, 8);

          return (
            <div key={i} className="space-y-1" data-testid={`row-top-format-${i}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary w-5 text-right">#{i + 1}</span>
                <p className="text-xs text-foreground flex-1" data-testid={`text-format-name-${i}`}>
                  {format.structure_type?.replace(/_/g, " ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 pl-7">
                <div className="flex-1 h-1.5 bg-muted/50 rounded-full">
                  <div
                    className="h-full bg-primary/60 rounded-full"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right">{count}</span>
                {virality > 0 && (
                  <span className="text-[10px] text-emerald-500 font-mono w-8 text-right">{virality.toFixed(1)}</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

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

  const isLoading = dashboardLoading || radarLoading || oppLoading;
  const metrics = radarData?.metrics;
  const opportunities = opportunityData?.opportunities || [];
  const trends = radarData?.emerging_trends || [];

  const trendingVideos = dashboardData?.trending_videos || [];
  const dailyViralPlay = dashboardData?.daily_viral_play || null;
  const topHooks = dashboardData?.top_hooks || [];
  const topFormats = dashboardData?.top_formats || [];
  const alerts = dashboardData?.alerts || [];

  const highVelocityCount = trendingVideos.filter((v) => (v.virality_score || 0) >= 3).length;
  const patternsCount = (dashboardData?.top_patterns?.length || 0) + topHooks.length + topFormats.length;

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
          <Skeleton className="h-48 rounded-md" />
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

  const hasNoData = !metrics?.total_videos && opportunities.length === 0 && trendingVideos.length === 0 && trends.length === 0;

  if (hasNoData && !(feedEvents && feedEvents.length > 0) && !(alerts && alerts.length > 0)) {
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

  const feedToDisplay = alerts.length > 0 ? alerts : (feedEvents || []);

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

        {dailyViralPlay && (
          <DailyViralPlayCard play={dailyViralPlay} t={t} />
        )}

        <TrendingVideosCarousel videos={trendingVideos} t={t} />

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TopHooksLeaderboard hooks={topHooks} t={t} />
          <TopFormatsLeaderboard formats={topFormats} t={t} />
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
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary" data-testid="text-section-intelligence-feed">
              {t.dashboard.intelligenceFeed}
            </h2>
          </div>
          {feedToDisplay.length > 0 ? (
            <Card>
              <CardContent className="p-5 space-y-3">
                {feedToDisplay.slice(0, 10).map((event) => {
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
