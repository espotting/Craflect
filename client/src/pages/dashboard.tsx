import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Eye,
  ArrowRight,
  TrendingUp,
  Zap,
  Target,
  Flame,
  BarChart3,
  Coins,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { OpportunityCard, type OpportunityData } from "@/components/opportunity-card";
import { VideoCardV2, type VideoCardData } from "@/components/video-card-v2";
import { GuidedWorkflow } from "@/components/guided-workflow";

interface ViralPlay {
  hook: string;
  format: string;
  topic: string;
  platform: string | null;
  viralityScore: number;
  viewRange: string;
  confidence: number;
  videoCount: number;
  whyItWorks: string;
  trendClassification: string | null;
}

interface TrendingOpportunity {
  id: string;
  hook: string;
  format: string;
  topic: string;
  platform: string;
  viralityScore: number;
  viewRange: string;
  views: number | null;
  thumbnailUrl: string | null;
}

interface TrendingHook {
  hook: string;
  hookType: string | null;
  topic: string | null;
  avgVirality: number;
  usageCount: number;
}

interface TrendingNiche {
  niche: string;
  label: string;
  videoCount: number;
  avgVirality: number;
  topScore: number;
}

interface CreditsInfo {
  credits: number;
  maxCredits: number;
  plan: string;
  costs: Record<string, number>;
  estimatedVideos: number;
}

function IntelligenceLayer() {
  const { t } = useLanguage();

  const { data: hooks } = useQuery<TrendingHook[]>({ queryKey: ["/api/home/trending-hooks"] });
  const { data: niches } = useQuery<TrendingNiche[]>({ queryKey: ["/api/home/trending-niches"] });
  const { data: trending } = useQuery<TrendingOpportunity[]>({ queryKey: ["/api/home/trending-opportunities"] });

  const totalVideos = niches?.reduce((sum, n) => sum + n.videoCount, 0) || 0;
  const totalPatterns = trending?.length || 0;
  const avgVirality = niches && niches.length > 0
    ? (niches.reduce((sum, n) => sum + n.avgVirality, 0) / niches.length).toFixed(1)
    : "0";

  const stats = [
    { label: t.dashboard?.intel?.videosAnalyzed || "Videos Analyzed", value: totalVideos.toLocaleString(), change: "+12%", icon: BarChart3, color: "text-blue-400" },
    { label: t.dashboard?.intel?.patternsDetected || "Patterns Detected", value: totalPatterns.toString(), change: "+8%", icon: TrendingUp, color: "text-purple-400" },
    { label: t.dashboard?.intel?.avgVirality || "Avg Virality Score", value: avgVirality, change: "+5%", icon: Zap, color: "text-orange-400" },
    { label: t.dashboard?.intel?.successRate || "Success Rate", value: "68%", change: "+15%", icon: TrendingUp, color: "text-green-400" },
  ];

  const topHooks = hooks?.slice(0, 5) || [];

  return (
    <div className="space-y-6" data-testid="intelligence-layer">
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800" data-testid={`stat-card-${i}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-green-400 text-sm">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            {t.dashboard?.intel?.topPatterns || "Top Performing Patterns"}
          </h3>
          <div className="space-y-3">
            {trending?.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-slate-500 w-6">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm truncate">{item.hook}</span>
                    <span className="text-purple-400 text-sm font-medium ml-2 shrink-0">{item.viralityScore}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${item.viralityScore}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            {t.dashboard?.intel?.trendingTopics || "Trending Topics"}
          </h3>
          <div className="space-y-3">
            {niches?.slice(0, 5).map((niche, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 w-6">{i + 1}</span>
                  <span className="text-white text-sm">{niche.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm">{niche.videoCount} videos</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    niche.avgVirality >= 75 ? "bg-red-500/20 text-red-400" :
                    niche.avgVirality >= 65 ? "bg-orange-500/20 text-orange-400" :
                    "bg-green-500/20 text-green-400"
                  }`}>
                    {niche.avgVirality >= 75 ? "hot" : niche.avgVirality >= 65 ? "rising" : "stable"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          {t.dashboard?.intel?.hookPerformance || "Hook Performance"}
        </h3>
        <div className="grid grid-cols-5 gap-4">
          {topHooks.map((hook, i) => (
            <div key={i} className="text-center p-3 bg-slate-800/50 rounded-xl">
              <p className="text-white font-medium text-sm capitalize mb-1">{hook.hookType?.replace(/_/g, " ") || "Hook"}</p>
              <p className="text-slate-400 text-xs">{hook.usageCount} uses</p>
              <p className="text-lg font-bold text-purple-400 mt-1">{Math.round(hook.avgVirality)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreatorLayer({
  viralPlay,
  trending,
  hooks,
  credits,
  onNavigate,
}: {
  viralPlay: ViralPlay | null;
  trending: TrendingOpportunity[] | undefined;
  hooks: TrendingHook[] | undefined;
  credits: CreditsInfo | undefined;
  onNavigate: (path: string) => void;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleSave = async (opp: TrendingOpportunity) => {
    try {
      await apiRequest("POST", "/api/ideas/save", {
        hook: opp.hook,
        format: opp.format,
        topic: opp.topic,
        opportunityScore: opp.viralityScore,
      });
      setSavedIds((prev) => new Set(prev).add(opp.id));
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({ title: t.dashboard?.savedIdea || "Idea saved" });
    } catch {}
  };

  const viralPlayOpp: OpportunityData | null = viralPlay ? {
    id: "viral-play",
    topic: viralPlay.topic,
    hook: viralPlay.hook,
    format: viralPlay.format,
    predictedViews: viralPlay.viewRange,
    confidence: viralPlay.confidence,
    trend: (viralPlay.trendClassification === "rising" ? "rising" : viralPlay.viralityScore >= 80 ? "hot" : "stable") as "rising" | "stable" | "hot",
    whyItWorks: viralPlay.whyItWorks,
  } : null;

  const trendingAsVideos: VideoCardData[] = (trending || []).map((opp) => ({
    id: opp.id,
    hook: opp.hook,
    format: opp.format,
    views: opp.viewRange,
    viralityScore: opp.viralityScore,
    platform: opp.platform,
    thumbnail: opp.thumbnailUrl || undefined,
  }));

  const opportunities: OpportunityData[] = (trending || []).slice(4).map((opp) => ({
    id: opp.id,
    topic: opp.topic,
    hook: opp.hook,
    format: opp.format,
    predictedViews: opp.viewRange,
    confidence: opp.viralityScore,
    trend: (opp.viralityScore >= 80 ? "hot" : opp.viralityScore >= 65 ? "rising" : "stable") as "rising" | "stable" | "hot",
  }));

  return (
    <div className="space-y-8" data-testid="creator-layer">
      {viralPlayOpp && (
        <OpportunityCard
          opportunity={viralPlayOpp}
          featured
          onCreate={(opp) => onNavigate(`/create?hook=${encodeURIComponent(opp.hook)}&format=${encodeURIComponent(opp.format)}&topic=${encodeURIComponent(opp.topic)}`)}
          onSeeSimilar={() => onNavigate("/opportunities")}
        />
      )}

      {trendingAsVideos.length > 0 && (
        <section data-testid="section-trending-videos">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                {t.dashboard?.trendingOpportunities || "Trending Videos"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">{t.dashboard?.trendingOpportunitiesDesc || "Top performing content right now"}</p>
            </div>
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => onNavigate("/opportunities")} data-testid="button-see-all-videos">
              {t.dashboard?.seeAll || "See All"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {trendingAsVideos.slice(0, 4).map((video) => (
              <VideoCardV2
                key={video.id}
                video={video}
                onCreateSimilar={(v) => onNavigate(`/create?hook=${encodeURIComponent(v.hook)}&format=${encodeURIComponent(v.format)}`)}
                onAnalyze={() => {}}
                onSave={(v) => {
                  const opp = trending?.find((o) => o.id === v.id);
                  if (opp) handleSave(opp);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {opportunities.length > 0 && (
        <section data-testid="section-more-opportunities">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              {t.dashboard?.moreOpportunities || "More Opportunities"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">{t.dashboard?.moreOpportunitiesDesc || "Additional content ideas based on current trends"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onCreate={(o) => onNavigate(`/create?hook=${encodeURIComponent(o.hook)}&format=${encodeURIComponent(o.format)}&topic=${encodeURIComponent(o.topic)}`)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="bg-gradient-to-r from-purple-900/30 to-fuchsia-900/30 rounded-2xl p-8 border border-purple-500/20" data-testid="section-cta-studio">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t.dashboard?.readyToCreate || "Ready to create your next viral video?"}
            </h2>
            <p className="text-slate-400">
              {t.dashboard?.jumpIntoStudio || "Jump into the Studio and turn these insights into viral content"}
            </p>
          </div>
          <Button
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-14 text-lg font-semibold rounded-xl"
            onClick={() => onNavigate("/create")}
            data-testid="button-open-studio"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {t.dashboard?.openStudio || "Open Studio"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [intelligenceMode, setIntelligenceMode] = useState(false);
  const [workflowStep] = useState<"idea" | "script" | "blueprint" | "export">("idea");

  const { data: viralPlay, isLoading: loadingPlay } = useQuery<ViralPlay | null>({
    queryKey: ["/api/home/viral-play"],
  });
  const { data: trending, isLoading: loadingTrending } = useQuery<TrendingOpportunity[]>({
    queryKey: ["/api/home/trending-opportunities"],
  });
  const { data: hooks } = useQuery<TrendingHook[]>({ queryKey: ["/api/home/trending-hooks"] });
  const { data: credits } = useQuery<CreditsInfo>({ queryKey: ["/api/credits"] });

  const isLoading = loadingPlay || loadingTrending;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32" data-testid="page-dashboard">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-page-title">{t.dashboard?.title || "Home"}</h1>
            <p className="text-slate-400 text-sm">{t.dashboard?.subtitle || "Your content creation hub"}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded-lg border border-slate-800" data-testid="mode-toggle">
              <button
                onClick={() => setIntelligenceMode(false)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!intelligenceMode ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                data-testid="button-creator-mode"
              >
                <Sparkles className="w-4 h-4 inline mr-1" />
                {t.dashboard?.creatorMode || "Creator"}
              </button>
              <button
                onClick={() => setIntelligenceMode(true)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${intelligenceMode ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                data-testid="button-intelligence-mode"
              >
                <BarChart3 className="w-4 h-4 inline mr-1" />
                {t.dashboard?.intelligenceMode || "Intelligence"}
              </button>
            </div>

            {credits && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800" data-testid="credits-counter">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-white" data-testid="text-credits-count">{credits.credits}</span>
                <span className="text-xs text-slate-400">/ {credits.maxCredits}</span>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : intelligenceMode ? (
          <IntelligenceLayer />
        ) : (
          <CreatorLayer
            viralPlay={viralPlay ?? null}
            trending={trending}
            hooks={hooks}
            credits={credits}
            onNavigate={navigate}
          />
        )}
      </div>

      {!intelligenceMode && (
        <GuidedWorkflow
          currentStep={workflowStep}
          onNextAction={() => navigate("/create")}
          onStepClick={() => navigate("/create")}
        />
      )}
    </DashboardLayout>
  );
}
