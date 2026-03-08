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
  Loader2,
  Image,
  Lock,
  RefreshCw,
  Check,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VideoCard, VideoCardData } from "@/components/video-card";
import { getPredictedViews, getViralityColor, formatCompactNumber } from "@/lib/predicted-views";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRef, useState, useEffect, useCallback } from "react";

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

function ViralOpportunityToday({
  play, t, savedIdeas,
}: {
  play: DashboardData["daily_viral_play"];
  t: any;
  savedIdeas: any[];
}) {
  const [, navigate] = useLocation();
  const [saving, setSaving] = useState(false);

  if (!play) return null;

  const hookText = play.example_hook || play.hook_type || "";
  const topicLabel = play.topic_cluster
    ? TOPIC_CLUSTER_LABELS[play.topic_cluster] || formatLabel(play.topic_cluster)
    : null;
  const predicted = getPredictedViews(play.pattern_score);
  const viralityColorClass = getViralityColor(play.pattern_score);

  const isSaved = (savedIdeas || []).some(
    (i: any) => i.hook === hookText && i.status === "saved"
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isSaved) {
        const idea = (savedIdeas || []).find((i: any) => i.hook === hookText && i.status === "saved");
        if (idea) await apiRequest("POST", "/api/ideas/dismiss", { id: idea.id });
      } else {
        await apiRequest("POST", "/api/ideas/save", {
          hook: hookText,
          format: play.structure_type || "",
          topic: play.topic_cluster || "",
          opportunityScore: Math.round(play.pattern_score || 0),
          velocity: 0,
          videosDetected: play.video_count || 0,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  return (
    <div className="space-y-4" data-testid="section-viral-opportunity">
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold text-foreground" data-testid="text-section-viral-opportunity">
          {t.dashboard.viralOpportunityToday || "Viral Opportunity Today"}
        </h2>
      </div>

      <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent" data-testid="card-viral-opportunity">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {topicLabel && (
                <Badge variant="secondary" className="text-xs font-semibold" data-testid="badge-opportunity-topic">
                  {topicLabel}
                </Badge>
              )}

              {hookText && (
                <p className="text-lg font-bold text-foreground leading-snug" data-testid="text-opportunity-hook">
                  "{hookText}"
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {play.structure_type && (
                  <Badge variant="outline" className="text-xs" data-testid="badge-opportunity-format">
                    {formatLabel(play.structure_type)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`text-3xl font-bold ${viralityColorClass}`} data-testid="text-opportunity-score">
                {Math.round(play.pattern_score)}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border/50">
            <span className="flex items-center gap-1.5" data-testid="text-opportunity-predicted">
              <Eye className="w-4 h-4" />
              {predicted.label}
            </span>
            {play.video_count > 0 && (
              <span className="flex items-center gap-1.5" data-testid="text-opportunity-videos">
                <Target className="w-4 h-4" />
                {play.video_count} videos
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              className="bg-violet-600 text-white"
              onClick={() => navigate(`/create?hook=${encodeURIComponent(hookText)}&format=${encodeURIComponent(play.structure_type || "")}&topic=${encodeURIComponent(play.topic_cluster || "")}`)}
              data-testid="button-opportunity-create"
            >
              <Play className="w-4 h-4 mr-2 fill-white" />
              {t.dashboard.createVideo}
            </Button>

            <Button
              variant={isSaved ? "secondary" : "outline"}
              onClick={handleSave}
              disabled={saving || !hookText}
              className="gap-2"
              data-testid="button-opportunity-save"
            >
              <Star className={`w-4 h-4 ${isSaved ? "fill-yellow-500 text-yellow-500" : ""}`} />
              {isSaved ? (t.dashboard.saved || "Saved") : (t.dashboard.save || "Save")}
            </Button>

            <Button
              variant="ghost"
              onClick={handleRefresh}
              className="gap-2"
              data-testid="button-opportunity-refresh"
            >
              <RefreshCw className="w-4 h-4" />
              {t.dashboard.generateAnother || "Refresh"}
            </Button>
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
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <div className="space-y-4" data-testid="section-create-from-image">
      <div className="flex items-center gap-2">
        <ImagePlus className="w-5 h-5 text-cyan-500" />
        <h2 className="text-lg font-bold text-foreground" data-testid="text-section-create-image">
          {t.dashboard.createFromImage}
        </h2>
      </div>

      <Card className="group transition-all duration-200" data-testid="card-create-from-image">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-dashed border-cyan-500/30 flex items-center justify-center">
              <Image className="w-10 h-10 text-cyan-500/50" />
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                {t.dashboard.createFromImage}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {t.dashboard.createFromImageDesc}
              </p>
            </div>

            <Button
              variant="outline"
              className="flex-shrink-0"
              onClick={() => setShowComingSoon(true)}
              data-testid="button-generate-from-image"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t.dashboard.generateFromImage || "Generate Video Idea from Image"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-muted-foreground" />
              {t.dashboard.createFromImage}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
              <Image className="w-8 h-8 text-cyan-500/50" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t.sidebar.comingSoon}
            </p>
            <p className="text-xs text-muted-foreground/70 text-center max-w-sm">
              {t.dashboard.createFromImageDesc}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: savedIdeas } = useQuery<any[]>({ queryKey: ["/api/ideas"] });

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
          onCreateClick={() => setShowGenerateModal(true)}
        />

        <ViralOpportunityToday play={dailyViralPlay} t={t} savedIdeas={savedIdeas || []} />

        <TrendingOpportunities videos={trendingVideos} t={t} />

        <CreateFromImageSection t={t} />
      </div>

      <GenerateIdeaDialog
        open={showGenerateModal}
        onOpenChange={setShowGenerateModal}
        user={user}
        t={t}
        savedIdeas={savedIdeas || []}
      />
    </DashboardLayout>
  );
}

interface ViralIdea {
  topic: string;
  hook: string;
  format: string;
  structure: string;
  viralityScore: number;
}

const ANALYSIS_STEPS = [
  "Analyzing trending hooks...",
  "Analyzing viral formats...",
  "Analyzing niche engagement...",
  "Calculating virality score...",
];

function AnimatedScore({ target }: { target: number }) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return <span>{current}</span>;
}

function GenerateIdeaDialog({
  open,
  onOpenChange,
  user,
  t,
  savedIdeas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  t: any;
  savedIdeas: any[];
}) {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [idea, setIdea] = useState<ViralIdea | null>(null);
  const [error, setError] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const generationRef = useRef(0);

  const generate = useCallback(async () => {
    const genId = ++generationRef.current;
    setLoading(true);
    setIdea(null);
    setError(false);
    setAnalysisStep(-1);

    const delays = [300, 700, 1200, 1800];
    const timers = delays.map((delay, idx) =>
      setTimeout(() => {
        if (generationRef.current === genId) setAnalysisStep(idx);
      }, delay)
    );

    try {
      const niches = user?.selectedNiches || [];
      const creatorType = user?.userGoal || "content_creator";
      const resp = await apiRequest("POST", "/api/onboarding/generate-idea", {
        niches,
        creatorType,
      });
      if (generationRef.current !== genId) return;
      const data = await resp.json();
      setAnalysisStep(3);
      await new Promise((r) => setTimeout(r, 400));
      if (generationRef.current !== genId) return;
      setIdea(data);
    } catch {
      if (generationRef.current === genId) {
        setError(true);
      }
    } finally {
      if (generationRef.current === genId) {
        setLoading(false);
      }
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [user]);

  useEffect(() => {
    if (open) {
      generate();
    } else {
      setIdea(null);
      setError(false);
      setLoading(false);
      setAnalysisStep(-1);
    }
  }, [open, generate]);

  const handleCreateVideo = async () => {
    if (!idea) return;
    try {
      await apiRequest("POST", "/api/projects", {
        title: (idea.hook || "Untitled").substring(0, 80),
        hook: idea.hook,
        format: idea.format || undefined,
        topic: idea.topic || undefined,
        status: "draft",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } catch {}
    const params = new URLSearchParams();
    params.set("hook", idea.hook);
    params.set("format", idea.format);
    params.set("topic", idea.topic);
    if (idea.structure) params.set("structure", idea.structure);
    onOpenChange(false);
    navigate(`/create?${params.toString()}`);
  };

  const [savingIdea, setSavingIdea] = useState(false);
  const ideaIsSaved = idea ? (savedIdeas || []).some(
    (i: any) => i.hook === idea.hook && i.status === "saved"
  ) : false;

  const handleSaveIdea = async () => {
    if (!idea) return;
    setSavingIdea(true);
    try {
      if (ideaIsSaved) {
        const existing = (savedIdeas || []).find((i: any) => i.hook === idea.hook && i.status === "saved");
        if (existing) await apiRequest("POST", "/api/ideas/dismiss", { id: existing.id });
      } else {
        await apiRequest("POST", "/api/ideas/save", {
          hook: idea.hook,
          format: idea.format || "",
          topic: idea.topic || "",
          opportunityScore: Math.round(idea.viralityScore || 0),
          velocity: 0,
          videosDetected: 0,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
    } catch {} finally {
      setSavingIdea(false);
    }
  };

  const predicted = idea ? getPredictedViews(idea.viralityScore) : null;
  const viralityColorClass = idea ? getViralityColor(idea.viralityScore) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-generate-dialog-title">
            <Sparkles className="w-5 h-5 text-violet-500" />
            {t.dashboard.createViralVideo}
          </DialogTitle>
        </DialogHeader>

        {loading && !idea && (
          <div className="flex flex-col items-center gap-6 py-6" data-testid="section-generating-loading">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-violet-500 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-foreground" data-testid="text-generating-idea">
              {t.dashboard.createViralVideo}...
            </p>
            <div className="space-y-3 w-full max-w-sm">
              {ANALYSIS_STEPS.map((label, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 transition-opacity duration-300 ${
                    analysisStep >= idx ? "opacity-100" : "opacity-20"
                  }`}
                  data-testid={`analysis-step-${idx}`}
                >
                  {analysisStep >= idx ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                    </div>
                  )}
                  <span className={`text-sm ${analysisStep >= idx ? "text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-6" data-testid="section-generate-error">
            <p className="text-sm text-muted-foreground text-center">
              An error occurred. Please try again.
            </p>
            <Button
              variant="outline"
              onClick={generate}
              data-testid="button-retry-generate"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {idea && (
          <div className="space-y-5 py-2" data-testid="section-idea-result">
            <Card className="border-violet-500/20" data-testid="card-generated-idea">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    Topic
                  </span>
                  <p className="text-sm font-semibold text-violet-600 dark:text-violet-400" data-testid="text-idea-topic">
                    {formatLabel(idea.topic)}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    Hook
                  </span>
                  <p className="text-base font-bold text-foreground leading-snug" data-testid="text-idea-hook">
                    "{idea.hook}"
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    Format
                  </span>
                  <Badge variant="secondary" className="text-xs" data-testid="badge-idea-format">
                    {formatLabel(idea.format)}
                  </Badge>
                </div>

                {idea.structure && (
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Video Structure
                    </span>
                    <p className="text-sm text-muted-foreground" data-testid="text-idea-structure">
                      {idea.structure}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Virality Score
                    </span>
                    <div className={`text-2xl font-bold ${viralityColorClass}`} data-testid="text-idea-score">
                      <AnimatedScore target={idea.viralityScore} />
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      {t.dashboard.predictedViewsRange}
                    </span>
                    <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1 justify-end" data-testid="text-idea-predicted">
                      <Eye className="w-4 h-4" />
                      {predicted?.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-violet-600 text-white"
                  onClick={handleCreateVideo}
                  data-testid="button-create-from-idea"
                >
                  <Play className="w-4 h-4 mr-2 fill-white" />
                  {t.dashboard.createVideo}
                </Button>
                <Button
                  variant={ideaIsSaved ? "secondary" : "outline"}
                  onClick={handleSaveIdea}
                  disabled={savingIdea}
                  className="gap-2"
                  data-testid="button-save-idea"
                >
                  <Star className={`w-4 h-4 ${ideaIsSaved ? "fill-yellow-500 text-yellow-500" : ""}`} />
                  {ideaIsSaved ? (t.dashboard.saved || "Saved") : (t.dashboard.save || "Save")}
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={generate}
                disabled={loading}
                data-testid="button-generate-another"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {t.dashboard.generateAnother || "Generate another idea"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
