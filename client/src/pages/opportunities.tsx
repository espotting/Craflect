import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, TrendingUp, Filter, Flame, Zap, BarChart3, Check, ArrowUpRight } from "lucide-react";
import { VideoCardV2, type VideoCardData } from "@/components/video-card-v2";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OpportunityItem {
  id: string;
  hook: string;
  format: string;
  topic: string;
  platform: string;
  viralityScore: number;
  viewRange: string;
  views: number | null;
  thumbnailUrl: string | null;
  whyItWorks?: string;
  videoCount?: number;
  confidence?: number;
  patternId?: string;
  nicheCluster?: string;
  trendStatus?: string;
  velocity7d?: number;
  compatibility?: "your_niche" | "related" | null;
  compatibilityScore?: number;
  matchType?: "perfect_match" | "good_match" | "explore";
}

const SORT_OPTIONS = [
  { key: "compatibility", label: "By Compatibility" },
  { key: "virality", label: "By Virality" },
  { key: "velocity", label: "By Velocity" },
];

interface FormatInfo {
  format: string;
  count: number;
  avgVirality: number;
}

const FORMAT_FILTERS = [
  { key: "all", label: "All" },
  { key: "tutorial", label: "Tutorial" },
  { key: "storytelling", label: "Storytelling" },
  { key: "listicle", label: "Listicle" },
  { key: "reaction", label: "Reaction" },
];

const HOOK_FILTERS = [
  { key: "all", label: "All Hooks" },
  { key: "statement", label: "Statement" },
  { key: "curiosity", label: "Curiosity" },
  { key: "question", label: "Question" },
  { key: "list", label: "List" },
  { key: "shock", label: "Shock" },
];

const VELOCITY_FILTERS = [
  { key: "all", label: "All", icon: null },
  { key: "emerging", label: "Emerging", icon: Flame },
  { key: "trending", label: "Trending", icon: Zap },
  { key: "rising", label: "Rising", icon: BarChart3 },
];

export default function OpportunitiesPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [hookFilter, setHookFilter] = useState<string>("all");
  const [velocityFilter, setVelocityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("compatibility");
  const [visibleCount, setVisibleCount] = useState(12);

  const params = new URLSearchParams();
  if (formatFilter !== "all") params.set("format", formatFilter);
  if (hookFilter !== "all") params.set("hookType", hookFilter);
  if (velocityFilter !== "all") params.set("velocity", velocityFilter);
  const queryString = params.toString();
  const queryUrl = queryString ? `/api/opportunities/top?${queryString}` : "/api/opportunities/top";

  const { data: opportunities, isLoading } = useQuery<OpportunityItem[]>({
    queryKey: ["/api/opportunities/top", formatFilter, hookFilter, velocityFilter],
    queryFn: () => fetch(queryUrl, { credentials: "include" }).then(r => r.json()),
  });

  const sortedOpportunities = [...(opportunities || [])].sort((a, b) => {
    if (sortBy === "compatibility") return (b.compatibilityScore ?? 0) - (a.compatibilityScore ?? 0);
    if (sortBy === "velocity") return (b.velocity7d ?? 0) - (a.velocity7d ?? 0);
    return b.viralityScore - a.viralityScore;
  });

  const videos: VideoCardData[] = sortedOpportunities.map((opp) => ({
    id: opp.id,
    hook: opp.hook,
    format: opp.format,
    views: opp.viewRange,
    viralityScore: opp.viralityScore,
    platform: opp.platform,
    thumbnail: opp.thumbnailUrl || undefined,
  }));

  const visibleVideos = videos.slice(0, visibleCount);

  const handleCreateSimilar = (video: VideoCardData) => {
    const opp = opportunities?.find((o) => o.id === video.id);
    const p = new URLSearchParams({ hook: video.hook, format: video.format });
    if (opp) {
      if (opp.topic) p.set("topic", opp.topic);
      if (opp.viralityScore) p.set("viralityScore", String(opp.viralityScore));
      if (opp.videoCount) p.set("videoCount", String(opp.videoCount));
      if (opp.whyItWorks) p.set("whyItWorks", encodeURIComponent(opp.whyItWorks));
      if (opp.patternId) p.set("patternId", opp.patternId);
      if (opp.confidence) p.set("confidence", String(opp.confidence));
    }
    navigate(`/create?${p.toString()}`);
  };

  const handleSave = async (video: VideoCardData) => {
    try {
      const opp = opportunities?.find((o) => o.id === video.id);
      if (opp) {
        await apiRequest("POST", "/api/ideas/save", {
          hook: opp.hook,
          format: opp.format,
          topic: opp.topic,
          opportunityScore: opp.viralityScore,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
        toast({ title: t.dashboard?.savedIdea || "Idea saved" });
      }
    } catch {}
  };

  const getCompatibilityBadge = (opp: OpportunityItem) => {
    const match = opp.matchType;
    const score = opp.compatibilityScore ?? 0;
    if (match === "perfect_match" || opp.compatibility === "your_niche") {
      return (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] px-1.5 py-0.5">
            <Check className="w-3 h-3 mr-0.5" />
            ⭐ Perfect Match {score > 0 ? `· ${score}` : ""}
          </Badge>
        </div>
      );
    }
    if (match === "good_match" || opp.compatibility === "related") {
      return (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] px-1.5 py-0.5">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            ✓ Good Match {score > 0 ? `· ${score}` : ""}
          </Badge>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto" data-testid="page-opportunities">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-page-title">
              {t.opportunities?.title || "Opportunities"}
            </h2>
            <p className="text-slate-400">
              {t.opportunities?.subtitle || "All viral opportunities matched to your niche"}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 text-xs font-medium w-16">Format</span>
            {FORMAT_FILTERS.map((f) => (
              <Button
                key={f.key}
                variant="outline"
                size="sm"
                className={`border-slate-700 text-slate-300 text-xs h-8 ${formatFilter === f.key ? "bg-purple-600/20 border-purple-500/50 text-purple-300" : ""}`}
                onClick={() => { setFormatFilter(f.key); setVisibleCount(12); }}
                data-testid={`filter-format-${f.key}`}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 text-xs font-medium w-16">Hook</span>
            {HOOK_FILTERS.map((f) => (
              <Button
                key={f.key}
                variant="outline"
                size="sm"
                className={`border-slate-700 text-slate-300 text-xs h-8 ${hookFilter === f.key ? "bg-purple-600/20 border-purple-500/50 text-purple-300" : ""}`}
                onClick={() => { setHookFilter(f.key); setVisibleCount(12); }}
                data-testid={`filter-hook-${f.key}`}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 text-xs font-medium w-16">Sort</span>
            {SORT_OPTIONS.map((s) => (
              <Button
                key={s.key}
                variant="outline"
                size="sm"
                className={`border-slate-700 text-slate-300 text-xs h-8 ${sortBy === s.key ? "bg-purple-600/20 border-purple-500/50 text-purple-300" : ""}`}
                onClick={() => setSortBy(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 text-xs font-medium w-16">Velocity</span>
            {VELOCITY_FILTERS.map((f) => (
              <Button
                key={f.key}
                variant="outline"
                size="sm"
                className={`border-slate-700 text-slate-300 text-xs h-8 ${velocityFilter === f.key ? "bg-purple-600/20 border-purple-500/50 text-purple-300" : ""}`}
                onClick={() => { setVelocityFilter(f.key); setVisibleCount(12); }}
                data-testid={`filter-velocity-${f.key}`}
              >
                {f.icon && <f.icon className="w-3 h-3 mr-1" />}
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : visibleVideos.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">{t.opportunities?.noResults || "No opportunities found"}</h3>
            <p className="text-slate-400 text-sm">{t.opportunities?.tryDifferent || "Try a different filter"}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-6" data-testid="opportunities-grid">
              {visibleVideos.map((video) => {
                const opp = sortedOpportunities.find((o) => o.id === video.id);
                return (
                  <div key={video.id} className="relative">
                    {opp && getCompatibilityBadge(opp)}
                    <VideoCardV2
                      video={video}
                      onCreateSimilar={handleCreateSimilar}
                      onAnalyze={() => {}}
                      onSave={handleSave}
                    />
                  </div>
                );
              })}
            </div>

            {visibleCount < videos.length && (
              <div className="flex justify-center pt-8">
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-300 px-8"
                  onClick={() => setVisibleCount((prev) => prev + 8)}
                  data-testid="button-load-more"
                >
                  {t.opportunities?.loadMore || "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
