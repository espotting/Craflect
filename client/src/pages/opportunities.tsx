import { useState, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video-card";
import { Filter, Loader2, Target } from "lucide-react";
import { TOPIC_CLUSTERS, TOPIC_CLUSTER_LABELS } from "@shared/schema";

function formatLabel(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function useInfiniteScroll(callback: () => void, hasMore: boolean, isLoading: boolean) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node || !hasMore || isLoading) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) callback();
    }, { rootMargin: "200px" });
    observerRef.current.observe(node);
  }, [callback, hasMore, isLoading]);
  return sentinelRef;
}

function CardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-[9/16] rounded-md" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

const PAGE_SIZE = 20;

export default function Opportunities() {
  const { t } = useLanguage();
  const [platformFilter, setPlatformFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");

  const buildParams = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (platformFilter !== "all") params.set("platform", platformFilter);
    if (topicFilter !== "all") params.set("niche", topicFilter);
    params.set("sort", "virality");
    return params.toString();
  };

  const videosQuery = useInfiniteQuery({
    queryKey: ["opportunities-videos", platformFilter, topicFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/videos/browse?${buildParams(pageParam)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch videos");
      return res.json();
    },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.page < lastPage.pages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  const allVideos = videosQuery.data?.pages.flatMap((p: any) => p.videos) || [];
  const videoTotal = videosQuery.data?.pages[0]?.total || 0;

  const sentinelRef = useInfiniteScroll(
    () => videosQuery.fetchNextPage(),
    videosQuery.hasNextPage || false,
    videosQuery.isFetchingNextPage
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-opportunities">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-2" data-testid="text-opportunities-title">
            {t.opportunities.title}
          </h1>
          <p className="text-muted-foreground" data-testid="text-opportunities-subtitle">
            {t.opportunities.subtitle}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3" data-testid="filters-bar-opportunities">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-platform-filter">
              <SelectValue placeholder={t.opportunities.allPlatforms} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.opportunities.allPlatforms}</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
            </SelectContent>
          </Select>

          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-topic-filter">
              <SelectValue placeholder={t.opportunities.allTopics} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.opportunities.allTopics}</SelectItem>
              {TOPIC_CLUSTERS.map(tc => (
                <SelectItem key={tc} value={tc}>{TOPIC_CLUSTER_LABELS[tc] || formatLabel(tc)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {videoTotal > 0 && (
            <span className="text-sm text-muted-foreground ml-auto" data-testid="text-opportunity-count">
              {videoTotal} {t.opportunities?.results || "results"}
            </span>
          )}
        </div>

        {videosQuery.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : allVideos.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="grid-opportunities">
              {allVideos.map((video: any) => (
                <VideoCard
                  key={video.id}
                  video={{
                    id: video.id,
                    caption: video.caption,
                    hookText: video.hook_text || video.caption,
                    platform: video.platform,
                    views: video.views,
                    viralityScore: video.virality_score,
                    contentFormat: video.structure_type || video.content_format,
                    thumbnailUrl: video.thumbnail_url,
                    topicCluster: video.topic_cluster,
                  }}
                />
              ))}
            </div>
            <div ref={sentinelRef} className="flex justify-center py-4">
              {videosQuery.isFetchingNextPage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.opportunities.loadingMore}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-opportunities">
            <Target className="w-10 h-10 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.opportunities.noOpportunities}</h3>
            <p className="text-muted-foreground text-sm">{t.opportunities.noOpportunitiesDesc}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
