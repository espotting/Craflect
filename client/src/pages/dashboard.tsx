import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Eye,
  Flame,
  Play,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  ArrowRight,
  TrendingUp,
  Zap,
  Target,
  Upload,
} from "lucide-react";
import { VideoCard, VideoCardData } from "@/components/video-card";
import { getPredictedViews, getViralityColor, formatCompactNumber } from "@/lib/predicted-views";
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

function formatLabel(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function HeroCreateSection({ t, onCreateClick }: { t: any; onCreateClick: () => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 md:p-12"
      data-testid="section-hero-create"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight" data-testid="text-hero-title">
            {t.dashboard.createViralVideo}
          </h1>
          <p className="text-white/70 text-sm md:text-base max-w-md">
            {t.dashboard.subtitle}
          </p>
        </div>

        <Button
          size="lg"
          className="bg-white text-violet-700 font-semibold text-base rounded-xl shadow-xl shadow-black/20"
          onClick={onCreateClick}
          data-testid="button-create-viral-video"
        >
          <Play className="w-5 h-5 mr-2 fill-violet-700" />
          {t.dashboard.createViralVideo}
        </Button>
      </div>
    </div>
  );
}

function ViralPlayCard({ play, t }: { play: DashboardData["daily_viral_play"]; t: any }) {
  const [, navigate] = useLocation();
  if (!play) return null;

  const topicLabel = play.topic_cluster
    ? TOPIC_CLUSTER_LABELS[play.topic_cluster] || formatLabel(play.topic_cluster)
    : null;

  const predicted = getPredictedViews(play.pattern_score);
  const viralityColorClass = getViralityColor(play.pattern_score);

  return (
    <div className="space-y-4" data-testid="section-viral-play">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-violet-500" />
        <h2 className="text-lg font-bold text-foreground" data-testid="text-section-viral-play">
          {t.dashboard.viralPlayOfTheDay}
        </h2>
      </div>

      <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent" data-testid="card-viral-play">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-48 lg:w-56 aspect-[9/16] md:aspect-auto bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center relative flex-shrink-0">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
              <div className="absolute top-3 right-3">
                <Badge className={`${viralityColorClass} text-xs font-bold`} data-testid="badge-viral-play-score">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {Math.round(play.pattern_score)}
                </Badge>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-4">
              <div className="space-y-2">
                {play.example_hook && (
                  <p className="text-lg font-semibold text-foreground leading-snug" data-testid="text-viral-play-hook">
                    "{play.example_hook}"
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {play.hook_type && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-viral-play-hook-type">
                      {formatLabel(play.hook_type)}
                    </Badge>
                  )}
                  {play.structure_type && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-viral-play-format">
                      {formatLabel(play.structure_type)}
                    </Badge>
                  )}
                  {topicLabel && (
                    <Badge variant="secondary" className="text-xs" data-testid="badge-viral-play-topic">
                      {topicLabel}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5" data-testid="text-viral-play-predicted">
                  <Eye className="w-4 h-4" />
                  {predicted.label}
                </span>
                <span className="flex items-center gap-1.5" data-testid="text-viral-play-videos">
                  <Target className="w-4 h-4" />
                  {play.video_count} videos
                </span>
              </div>

              {play.reasoning && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2" data-testid="text-viral-play-reasoning">
                  {play.reasoning}
                </p>
              )}

              <Button
                className="bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => navigate(`/create?hook=${encodeURIComponent(play.example_hook || play.hook_type || "")}&format=${encodeURIComponent(play.structure_type || "")}&topic=${encodeURIComponent(play.topic_cluster || "")}`)}
                data-testid="button-viral-play-create"
              >
                <Play className="w-4 h-4 mr-2 fill-white" />
                {t.dashboard.createVideo}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendingOpportunities({ videos, t }: { videos: DashboardData["trending_videos"]; t: any }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -220 : 220,
        behavior: "smooth",
      });
    }
  };

  if (videos.length === 0) return null;

  const cardData: VideoCardData[] = videos.slice(0, 8).map(v => ({
    id: v.id,
    hookText: v.hook_text,
    caption: v.caption,
    platform: v.platform,
    views: v.views,
    viralityScore: v.virality_score,
    contentFormat: v.structure_type,
    thumbnailUrl: v.thumbnail_url,
    topicCluster: v.topic_cluster,
  }));

  return (
    <div className="space-y-4" data-testid="section-trending-opportunities">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-foreground" data-testid="text-section-trending">
            {t.dashboard.trendingOpportunities}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("left")} data-testid="button-trending-left">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("right")} data-testid="button-trending-right">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs ml-1" onClick={() => navigate("/opportunities")} data-testid="button-see-all-opportunities">
            {t.common.viewAll}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        {cardData.map(video => (
          <div key={video.id} className="flex-shrink-0">
            <VideoCard video={video} compact />
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateFromImageSection({ t }: { t: any }) {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-4" data-testid="section-create-from-image">
      <div className="flex items-center gap-2">
        <ImagePlus className="w-5 h-5 text-cyan-500" />
        <h2 className="text-lg font-bold text-foreground" data-testid="text-section-create-image">
          {t.dashboard.createFromImage}
        </h2>
      </div>

      <Card
        className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30"
        onClick={() => navigate("/create?mode=image")}
        data-testid="card-create-from-image"
      >
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-dashed border-cyan-500/30 flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
              <Upload className="w-10 h-10 text-cyan-500/50 group-hover:text-cyan-500/70 transition-colors" />
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                {t.dashboard.createFromImage}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {t.dashboard.createFromImageDesc}
              </p>
            </div>

            <Button variant="outline" className="flex-shrink-0" data-testid="button-upload-image">
              <Upload className="w-4 h-4 mr-2" />
              {t.dashboard.uploadImage}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const trendingVideos = dashboardData?.trending_videos || [];
  const dailyViralPlay = dashboardData?.daily_viral_play || null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <Skeleton className="h-64 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-48 rounded-md" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 rounded-md" />
            <div className="flex gap-4">
              <Skeleton className="h-72 w-44 rounded-md flex-shrink-0" />
              <Skeleton className="h-72 w-44 rounded-md flex-shrink-0" />
              <Skeleton className="h-72 w-44 rounded-md flex-shrink-0" />
              <Skeleton className="h-72 w-44 rounded-md flex-shrink-0" />
            </div>
          </div>
          <Skeleton className="h-32 rounded-md" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <HeroCreateSection
          t={t}
          onCreateClick={() => navigate("/create")}
        />

        <ViralPlayCard play={dailyViralPlay} t={t} />

        <TrendingOpportunities videos={trendingVideos} t={t} />

        <CreateFromImageSection t={t} />
      </div>
    </DashboardLayout>
  );
}
