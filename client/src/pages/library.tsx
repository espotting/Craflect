import { useState, useCallback, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TrendScore } from "@/components/trend-score";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import {
  Eye, Heart, MessageCircle, Share2, Zap, Globe, Filter, ArrowUpDown,
  Video, Layers, Users, FileText, Loader2, Search
} from "lucide-react";
import { TOPIC_CLUSTERS, TOPIC_CLUSTER_LABELS, HOOK_TYPES, STRUCTURE_TYPES } from "@shared/schema";
import { useLocation } from "wouter";

function PlatformIcon({ platform, className }: { platform: string | null | undefined; className?: string }) {
  const cls = className || "w-4 h-4";
  switch (platform) {
    case "tiktok": return <SiTiktok className={cls} />;
    case "instagram": return <SiInstagram className={cls} />;
    case "youtube": return <SiYoutube className={cls} />;
    default: return <Globe className={cls} />;
  }
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function VideoCardSkeleton() {
  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="w-10 h-10 rounded-md" />
        </div>
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function VideoCard({ video, t }: { video: any; t: any }) {
  const [, navigate] = useLocation();

  return (
    <Card className="border-border" data-testid={`card-video-${video.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground text-sm line-clamp-2" data-testid={`text-video-caption-${video.id}`}>
              {video.caption || "Untitled video"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <PlatformIcon platform={video.platform} className="w-3.5 h-3.5 text-muted-foreground" />
              {video.creator_name && (
                <span className="text-xs text-muted-foreground" data-testid={`text-video-creator-${video.id}`}>
                  @{video.creator_name}
                </span>
              )}
              {video.duration_bucket && (
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {video.duration_bucket}
                </Badge>
              )}
            </div>
          </div>
          {video.virality_score !== null && video.virality_score !== undefined && (
            <TrendScore score={Number(video.virality_score)} size="sm" />
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground" data-testid={`metrics-video-${video.id}`}>
          {video.views !== null && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatNumber(video.views)}
            </span>
          )}
          {video.likes !== null && (
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {formatNumber(video.likes)}
            </span>
          )}
          {video.comments !== null && (
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {formatNumber(video.comments)}
            </span>
          )}
          {video.shares !== null && (
            <span className="flex items-center gap-1">
              <Share2 className="w-3 h-3" />
              {formatNumber(video.shares)}
            </span>
          )}
          {video.view_velocity !== null && video.view_velocity !== undefined && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {Number(video.view_velocity).toFixed(1)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {video.hook_mechanism_primary && (
            <Badge variant="secondary" className="rounded-full text-[10px]">
              <Zap className="w-2.5 h-2.5 mr-1" />
              {formatLabel(video.hook_mechanism_primary)}
            </Badge>
          )}
          {video.structure_type && (
            <Badge variant="secondary" className="rounded-full text-[10px]">
              <Layers className="w-2.5 h-2.5 mr-1" />
              {formatLabel(video.structure_type)}
            </Badge>
          )}
          {video.topic_cluster && (
            <Badge variant="outline" className="rounded-full text-[10px]">
              {TOPIC_CLUSTER_LABELS[video.topic_cluster] || formatLabel(video.topic_cluster)}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => navigate(`/script-generator?hook=${encodeURIComponent(video.hook_mechanism_primary || "")}&topic=${encodeURIComponent(video.topic_cluster || "")}`)}
            data-testid={`button-create-script-${video.id}`}
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            {t.library.createScript}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PatternCard({ pattern, t }: { pattern: any; t: any }) {
  return (
    <Card className="border-border" data-testid={`card-pattern-${pattern.pattern_hook}-${pattern.content_format}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="rounded-full text-[10px]">
                <Zap className="w-2.5 h-2.5 mr-1" />
                {formatLabel(pattern.pattern_hook)}
              </Badge>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                <Layers className="w-2.5 h-2.5 mr-1" />
                {formatLabel(pattern.content_format)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {pattern.niche && (
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {TOPIC_CLUSTER_LABELS[pattern.niche] || formatLabel(pattern.niche)}
                </Badge>
              )}
              {pattern.platform && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <PlatformIcon platform={pattern.platform} className="w-3 h-3" />
                  {formatLabel(pattern.platform)}
                </span>
              )}
            </div>
          </div>
          {pattern.growth_score !== null && pattern.growth_score !== undefined && (
            <TrendScore score={Number(pattern.growth_score)} size="sm" />
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Video className="w-3 h-3" />
            {pattern.video_count} {t.library.videos}
          </span>
          {pattern.avg_engagement !== null && (
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {(Number(pattern.avg_engagement) * 100).toFixed(1)}% {t.library.engagement}
            </span>
          )}
        </div>

        {pattern.example_videos && pattern.example_videos.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t.library.examples}</p>
            <div className="space-y-1">
              {pattern.example_videos.slice(0, 3).map((ex: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate min-w-0 flex-1">{ex.caption || "—"}</span>
                  <span className="shrink-0 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(ex.views)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreatorCard({ creator, t }: { creator: any; t: any }) {
  return (
    <Card className="border-border" data-testid={`card-creator-${creator.creator_name}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border border-border shrink-0">
                <PlatformIcon platform={creator.platform} className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate" data-testid={`text-creator-name-${creator.creator_name}`}>
                  @{creator.creator_name}
                </p>
                <p className="text-xs text-muted-foreground">{formatLabel(creator.platform)}</p>
              </div>
            </div>
          </div>
          {creator.avg_virality !== null && creator.avg_virality !== undefined && (
            <TrendScore score={Number(creator.avg_virality)} size="sm" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-1">
            <span>{t.library.videos}:</span>
            <span className="font-medium text-foreground">{creator.video_count}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span>{t.library.viralVideos}:</span>
            <span className="font-medium text-foreground">{creator.viral_videos || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span>{t.library.views}:</span>
            <span className="font-medium text-foreground">{formatNumber(Number(creator.views_total))}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span>{t.library.avgViews}:</span>
            <span className="font-medium text-foreground">{formatNumber(Number(creator.avg_views))}</span>
          </div>
        </div>

        {creator.niche && (
          <Badge variant="outline" className="rounded-full text-[10px]">
            {TOPIC_CLUSTER_LABELS[creator.niche] || formatLabel(creator.niche)}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
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

export default function Library() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("videos");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [hookFilter, setHookFilter] = useState("all");
  const [structureFilter, setStructureFilter] = useState("all");
  const [sortBy, setSortBy] = useState("virality");
  const [minTrendScore, setMinTrendScore] = useState("");
  const [minVelocity, setMinVelocity] = useState("");

  const PAGE_SIZE = 20;

  const buildVideoParams = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (platformFilter !== "all") params.set("platform", platformFilter);
    if (topicFilter !== "all") params.set("niche", topicFilter);
    if (hookFilter !== "all") params.set("hook_type", hookFilter);
    if (structureFilter !== "all") params.set("structure_type", structureFilter);
    if (minTrendScore) params.set("min_trend_score", minTrendScore);
    if (minVelocity) params.set("min_velocity", minVelocity);
    params.set("sort", sortBy);
    return params.toString();
  };

  const videosQuery = useInfiniteQuery({
    queryKey: ["library-videos", platformFilter, topicFilter, hookFilter, structureFilter, sortBy, minTrendScore, minVelocity],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/videos/browse?${buildVideoParams(pageParam)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch videos");
      return res.json();
    },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.page < lastPage.pages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: activeTab === "videos",
  });

  const patternsQuery = useQuery({
    queryKey: ["library-patterns", topicFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (topicFilter !== "all") params.set("niche", topicFilter);
      const res = await fetch(`/api/patterns/browse?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patterns");
      return res.json();
    },
    enabled: activeTab === "patterns",
  });

  const creatorsQuery = useInfiniteQuery({
    queryKey: ["library-creators", topicFilter, platformFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set("page", String(pageParam));
      params.set("limit", String(PAGE_SIZE));
      if (topicFilter !== "all") params.set("niche", topicFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      const res = await fetch(`/api/creators?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch creators");
      return res.json();
    },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.page < lastPage.pages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: activeTab === "creators",
  });

  const allVideos = videosQuery.data?.pages.flatMap((p: any) => p.videos) || [];
  const videoTotal = videosQuery.data?.pages[0]?.total || 0;
  const allCreators = creatorsQuery.data?.pages.flatMap((p: any) => p.creators) || [];
  const creatorTotal = creatorsQuery.data?.pages[0]?.total || 0;
  const patterns = patternsQuery.data?.patterns || [];

  const videoSentinelRef = useInfiniteScroll(
    () => videosQuery.fetchNextPage(),
    videosQuery.hasNextPage || false,
    videosQuery.isFetchingNextPage
  );

  const creatorSentinelRef = useInfiniteScroll(
    () => creatorsQuery.fetchNextPage(),
    creatorsQuery.hasNextPage || false,
    creatorsQuery.isFetchingNextPage
  );

  const resetFilters = () => {
    setPlatformFilter("all");
    setTopicFilter("all");
    setHookFilter("all");
    setStructureFilter("all");
    setSortBy("virality");
    setMinTrendScore("");
    setMinVelocity("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-2" data-testid="text-library-title">
            {t.library.title}
          </h1>
          <p className="text-muted-foreground" data-testid="text-library-subtitle">
            {t.library.subtitle}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetFilters(); }} className="space-y-4">
          <TabsList data-testid="tabs-library">
            <TabsTrigger value="videos" data-testid="tab-videos" className="gap-2">
              <Video className="w-4 h-4" />
              {t.library.tabVideos}
            </TabsTrigger>
            <TabsTrigger value="patterns" data-testid="tab-patterns" className="gap-2">
              <Layers className="w-4 h-4" />
              {t.library.tabPatterns}
            </TabsTrigger>
            <TabsTrigger value="creators" data-testid="tab-creators" className="gap-2">
              <Users className="w-4 h-4" />
              {t.library.tabCreators}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center flex-wrap gap-3" data-testid="filters-bar">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-platform-filter">
                <SelectValue placeholder={t.library.allPlatforms} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.library.allPlatforms}</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
              </SelectContent>
            </Select>

            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-topic-filter">
                <SelectValue placeholder={t.library.allTopics} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.library.allTopics}</SelectItem>
                {TOPIC_CLUSTERS.map(tc => (
                  <SelectItem key={tc} value={tc}>{TOPIC_CLUSTER_LABELS[tc] || formatLabel(tc)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTab === "videos" && (
              <>
                <Select value={hookFilter} onValueChange={setHookFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-hook-filter">
                    <SelectValue placeholder={t.library.allHooks} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.library.allHooks}</SelectItem>
                    {HOOK_TYPES.map(h => (
                      <SelectItem key={h} value={h}>{formatLabel(h)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={structureFilter} onValueChange={setStructureFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-structure-filter">
                    <SelectValue placeholder={t.library.allStructures} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.library.allStructures}</SelectItem>
                    {STRUCTURE_TYPES.map(s => (
                      <SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder={t.library.minTrendScore}
                  value={minTrendScore}
                  onChange={e => setMinTrendScore(e.target.value)}
                  className="w-[130px]"
                  data-testid="input-min-trend-score"
                />

                <Input
                  type="number"
                  placeholder={t.library.minVelocity}
                  value={minVelocity}
                  onChange={e => setMinVelocity(e.target.value)}
                  className="w-[130px]"
                  data-testid="input-min-velocity"
                />
              </>
            )}

            {activeTab === "videos" && (
              <div className="flex items-center gap-2 ml-auto">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px]" data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virality">{t.library.sortVirality}</SelectItem>
                    <SelectItem value="views">{t.library.sortViews}</SelectItem>
                    <SelectItem value="velocity">{t.library.sortVelocity}</SelectItem>
                    <SelectItem value="engagement">{t.library.sortEngagement}</SelectItem>
                    <SelectItem value="recent">{t.library.sortRecent}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <TabsContent value="videos" className="space-y-4">
            {videosQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)}
              </div>
            ) : allVideos.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground" data-testid="text-video-count">
                  {t.library.totalResults.replace("{count}", String(videoTotal))}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allVideos.map((video: any) => (
                    <VideoCard key={video.id} video={video} t={t} />
                  ))}
                </div>
                <div ref={videoSentinelRef} className="flex justify-center py-4">
                  {videosQuery.isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.library.loadingMore}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-videos">
                <Video className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.library.noVideos}</h3>
                <p className="text-muted-foreground text-sm">{t.library.noVideosDesc}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            {patternsQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)}
              </div>
            ) : patterns.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground" data-testid="text-pattern-count">
                  {t.library.totalResults.replace("{count}", String(patterns.length))}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patterns.map((pattern: any, i: number) => (
                    <PatternCard key={`${pattern.pattern_hook}-${pattern.content_format}-${i}`} pattern={pattern} t={t} />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-patterns">
                <Layers className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.library.noPatterns}</h3>
                <p className="text-muted-foreground text-sm">{t.library.noPatternsDesc}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="creators" className="space-y-4">
            {creatorsQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)}
              </div>
            ) : allCreators.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground" data-testid="text-creator-count">
                  {t.library.totalResults.replace("{count}", String(creatorTotal))}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allCreators.map((creator: any, i: number) => (
                    <CreatorCard key={`${creator.creator_name}-${creator.platform}-${i}`} creator={creator} t={t} />
                  ))}
                </div>
                <div ref={creatorSentinelRef} className="flex justify-center py-4">
                  {creatorsQuery.isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.library.loadingMore}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-creators">
                <Users className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.library.noCreators}</h3>
                <p className="text-muted-foreground text-sm">{t.library.noCreatorsDesc}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
