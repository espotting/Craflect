import { useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, TrendingUp, Filter } from "lucide-react";
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
}

interface FormatInfo {
  format: string;
  count: number;
  avgVirality: number;
}

export default function OpportunitiesPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(12);

  const queryKey = formatFilter === "all"
    ? "/api/opportunities/top"
    : `/api/opportunities/top?format=${formatFilter}`;

  const { data: opportunities, isLoading } = useQuery<OpportunityItem[]>({
    queryKey: [queryKey],
  });

  const { data: formats } = useQuery<FormatInfo[]>({
    queryKey: ["/api/opportunities/trending-formats"],
  });

  const videos: VideoCardData[] = (opportunities || []).map((opp) => ({
    id: opp.id,
    hook: opp.hook,
    format: opp.format,
    views: opp.viewRange,
    viralityScore: opp.viralityScore,
    platform: opp.platform,
    thumbnail: opp.thumbnailUrl || undefined,
  }));

  const visibleVideos = videos.slice(0, visibleCount);

  // Passe le contexte complet vers Studio — c'est le lien Intelligence → Action
  const handleCreateSimilar = (video: VideoCardData) => {
    const opp = opportunities?.find((o) => o.id === video.id);

    const params = new URLSearchParams({
      hook: video.hook,
      format: video.format,
    });

    if (opp) {
      if (opp.topic) params.set("topic", opp.topic);
      if (opp.viralityScore) params.set("viralityScore", String(opp.viralityScore));
      if (opp.videoCount) params.set("videoCount", String(opp.videoCount));
      if (opp.whyItWorks) params.set("whyItWorks", encodeURIComponent(opp.whyItWorks));
      if (opp.patternId) params.set("patternId", opp.patternId);
      if (opp.confidence) params.set("confidence", String(opp.confidence));
    }

    navigate(`/create?${params.toString()}`);
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

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className={`border-slate-700 text-slate-300 ${formatFilter === "all" ? "bg-purple-600/20 border-purple-500/50" : ""}`}
              onClick={() => setFormatFilter("all")}
              data-testid="filter-all"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t.opportunities?.all || "All"}
            </Button>
            {formats?.slice(0, 4).map((f) => (
              <Button
                key={f.format}
                variant="outline"
                className={`border-slate-700 text-slate-300 capitalize ${formatFilter === f.format ? "bg-purple-600/20 border-purple-500/50" : ""}`}
                onClick={() => setFormatFilter(formatFilter === f.format ? "all" : f.format)}
                data-testid={`filter-${f.format}`}
              >
                <Video className="w-4 h-4 mr-2" />
                {f.format.replace(/_/g, " ")}
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
              {visibleVideos.map((video) => (
                <VideoCardV2
                  key={video.id}
                  video={video}
                  onCreateSimilar={handleCreateSimilar}
                  onAnalyze={() => {}}
                  onSave={handleSave}
                />
              ))}
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
