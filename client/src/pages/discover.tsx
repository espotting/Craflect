import { useState, useCallback, useRef } from "react";
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
  Video, Layers, Users, FileText, Loader2, Sparkles, TrendingUp, BarChart3, Compass, Puzzle
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

const nicheColors: Record<string, string> = {
  fitness: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  tech: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  beauty: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  food: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  finance: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  travel: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  gaming: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  education: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  lifestyle: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  music: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

function getNicheColor(niche: string) {
  const key = niche?.toLowerCase() || "";
  for (const [k, v] of Object.entries(nicheColors)) {
    if (key.includes(k)) return v;
  }
  return "bg-primary/15 text-primary border-primary/30";
}

function CardSkeleton() {
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

interface RadarData {
  metrics: {
    total_videos: number;
    videos_today: number;
    active_niches: number;
    creators_detected: number;
  };
  trending_hooks: {
    hook_text: string;
    hook_mechanism_primary: string;
    count: number;
    avg_virality: number;
  }[];
  trending_formats: {
    structure_type: string;
    count: number;
    avg_virality: number;
  }[];
  top_videos: unknown[];
  emerging_creators: unknown[];
  emerging_trends: {
    topic_cluster: string;
    hook_mechanism_primary: string;
    structure_type: string;
    video_count: number;
    avg_virality: number;
    latest_at: string;
  }[];
}

export default function Discover() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("videos");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [hookFilter, setHookFilter] = useState("all");
  const [structureFilter, setStructureFilter] = useState("all");
  const [sortBy, setSortBy] = useState("virality");
  const [minTrendScore, setMinTrendScore] = useState("");
  const [minVelocity, setMinVelocity] = useState("");
  const [nicheFilter, setNicheFilter] = useState<string>("all");

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
    queryKey: ["discover-videos", platformFilter, topicFilter, hookFilter, structureFilter, sortBy, minTrendScore, minVelocity],
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

  const nicheParam = (nicheFilter && nicheFilter !== "all") ? nicheFilter : undefined;
  const radarQuery = useQuery<RadarData>({
    queryKey: ["/api/trends/radar" + (nicheParam ? `?niche=${nicheParam}` : "")],
    enabled: activeTab === "trends" || activeTab === "hooks" || activeTab === "formats",
  });

  const patternsQuery = useQuery<{ patterns: any[] }>({
    queryKey: ["/api/patterns/browse", "source=table", nicheParam || "all"],
    queryFn: async () => {
      const params = new URLSearchParams({ source: "table" });
      if (nicheParam) params.set("niche", nicheParam);
      const res = await fetch(`/api/patterns/browse?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patterns");
      return res.json();
    },
    enabled: activeTab === "patterns",
  });

  const creatorsQuery = useInfiniteQuery({
    queryKey: ["discover-creators", topicFilter, platformFilter],
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

  const hooks = radarQuery.data?.trending_hooks || [];
  const formats = radarQuery.data?.trending_formats || [];
  const emergingTrends = radarQuery.data?.emerging_trends || [];
  const emergingCreators = radarQuery.data?.emerging_creators || [];

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
    setNicheFilter("all");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-discover">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-2" data-testid="text-discover-title">
            {t.discover.title}
          </h1>
          <p className="text-muted-foreground" data-testid="text-discover-subtitle">
            {t.discover.subtitle}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetFilters(); }} className="space-y-4">
          <TabsList data-testid="tabs-discover">
            <TabsTrigger value="videos" data-testid="tab-discover-videos" className="gap-2">
              <Video className="w-4 h-4" />
              {t.discover.tabVideos}
            </TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-discover-trends" className="gap-2">
              <Sparkles className="w-4 h-4" />
              {t.discover.tabTrends}
            </TabsTrigger>
            <TabsTrigger value="hooks" data-testid="tab-discover-hooks" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              {t.discover.tabHooks}
            </TabsTrigger>
            <TabsTrigger value="formats" data-testid="tab-discover-formats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {t.discover.tabFormats}
            </TabsTrigger>
            <TabsTrigger value="creators" data-testid="tab-discover-creators" className="gap-2">
              <Users className="w-4 h-4" />
              {t.discover.tabCreators}
            </TabsTrigger>
            <TabsTrigger value="patterns" data-testid="tab-discover-patterns" className="gap-2">
              <Puzzle className="w-4 h-4" />
              {t.discover.tabPatterns}
            </TabsTrigger>
          </TabsList>

          {activeTab === "videos" && (
            <div className="flex items-center flex-wrap gap-3" data-testid="filters-bar-videos">
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
            </div>
          )}

          {(activeTab === "trends" || activeTab === "hooks" || activeTab === "formats" || activeTab === "patterns") && (
            <div className="flex items-center flex-wrap gap-3" data-testid="filters-bar-radar">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={nicheFilter} onValueChange={setNicheFilter}>
                <SelectTrigger className="w-48" data-testid="select-niche-filter">
                  <SelectValue placeholder={t.dashboard.allNiches} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.dashboard.allNiches}</SelectItem>
                  {Object.keys(nicheColors).map((n) => (
                    <SelectItem key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeTab === "creators" && (
            <div className="flex items-center flex-wrap gap-3" data-testid="filters-bar-creators">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-creator-platform-filter">
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
                <SelectTrigger className="w-[160px]" data-testid="select-creator-topic-filter">
                  <SelectValue placeholder={t.library.allTopics} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.library.allTopics}</SelectItem>
                  {TOPIC_CLUSTERS.map(tc => (
                    <SelectItem key={tc} value={tc}>{TOPIC_CLUSTER_LABELS[tc] || formatLabel(tc)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <TabsContent value="videos" className="space-y-4">
            {videosQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : allVideos.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground" data-testid="text-video-count">
                  {t.library.totalResults.replace("{count}", String(videoTotal))}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allVideos.map((video: any) => (
                    <Card key={video.id} className="border-border" data-testid={`card-video-${video.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-sm line-clamp-2" data-testid={`text-video-caption-${video.id}`}>
                              {video.caption || "Untitled video"}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <PlatformIcon platform={video.platform} className="w-3.5 h-3.5 text-muted-foreground" />
                              {video.creator_name && (
                                <span className="text-xs text-muted-foreground">@{video.creator_name}</span>
                              )}
                              {video.duration_bucket && (
                                <Badge variant="outline" className="rounded-full text-[10px]">{video.duration_bucket}</Badge>
                              )}
                            </div>
                          </div>
                          {video.virality_score !== null && video.virality_score !== undefined && (
                            <TrendScore score={Number(video.virality_score)} size="sm" />
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {video.views !== null && (
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(video.views)}</span>
                          )}
                          {video.likes !== null && (
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNumber(video.likes)}</span>
                          )}
                          {video.comments !== null && (
                            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{formatNumber(video.comments)}</span>
                          )}
                          {video.shares !== null && (
                            <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{formatNumber(video.shares)}</span>
                          )}
                          {video.view_velocity !== null && video.view_velocity !== undefined && (
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{Number(video.view_velocity).toFixed(1)}</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {video.hook_mechanism_primary && (
                            <Badge variant="secondary" className="rounded-full text-[10px]">
                              <Zap className="w-2.5 h-2.5 mr-1" />{formatLabel(video.hook_mechanism_primary)}
                            </Badge>
                          )}
                          {video.structure_type && (
                            <Badge variant="secondary" className="rounded-full text-[10px]">
                              <Layers className="w-2.5 h-2.5 mr-1" />{formatLabel(video.structure_type)}
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
                            onClick={() => navigate(`/create?hook=${encodeURIComponent(video.hook_mechanism_primary || "")}&topic=${encodeURIComponent(video.topic_cluster || "")}`)}
                            data-testid={`button-create-script-${video.id}`}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            {t.library.createScript}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
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
              <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-discover-videos">
                <Video className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.library.noVideos}</h3>
                <p className="text-muted-foreground text-sm">{t.library.noVideosDesc}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {radarQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-md" />)}
              </div>
            ) : emergingTrends.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-discover-trends">
                <Sparkles className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.discover.noTrends}</h3>
                <p className="text-muted-foreground text-sm">{t.discover.noTrendsDesc}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emergingTrends.map((trend, i) => (
                  <Card key={i} data-testid={`card-trend-${i}`}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant="outline" className={getNicheColor(trend.topic_cluster)} data-testid={`badge-trend-niche-${i}`}>
                          {trend.topic_cluster}
                        </Badge>
                        <TrendScore score={Number(trend.avg_virality) || 0} size="sm" showLabel />
                      </div>
                      <div className="space-y-1">
                        {trend.hook_mechanism_primary && (
                          <p className="text-sm font-medium" data-testid={`text-trend-hook-${i}`}>
                            {trend.hook_mechanism_primary.replace(/_/g, " ")}
                          </p>
                        )}
                        {trend.structure_type && (
                          <p className="text-xs text-muted-foreground" data-testid={`text-trend-format-${i}`}>
                            {trend.structure_type.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{trend.video_count} {t.discover.videoCount.toLowerCase()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="hooks" className="space-y-4">
            {radarQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-md" />)}
              </div>
            ) : hooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-discover-hooks">
                <TrendingUp className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.discover.noHooks}</h3>
                <p className="text-muted-foreground text-sm">{t.discover.noHooksDesc}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hooks.map((hook, i) => (
                  <Card key={i} data-testid={`card-hook-${i}`}>
                    <CardContent className="p-5 space-y-3">
                      <p className="text-sm font-medium line-clamp-3" data-testid={`text-hook-text-${i}`}>
                        {hook.hook_text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {hook.hook_mechanism_primary && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-mechanism-${i}`}>
                            {hook.hook_mechanism_primary}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{hook.count} {t.discover.videoCount.toLowerCase()}</span>
                      </div>
                      <div className="flex items-center justify-end">
                        <TrendScore score={Number(hook.avg_virality) || 0} size="sm" showLabel />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="formats" className="space-y-4">
            {radarQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-md" />)}
              </div>
            ) : formats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-discover-formats">
                <BarChart3 className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.discover.noFormats}</h3>
                <p className="text-muted-foreground text-sm">{t.discover.noFormatsDesc}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formats.map((fmt, i) => (
                  <Card key={i} data-testid={`card-format-${i}`}>
                    <CardContent className="p-5 space-y-3">
                      <p className="text-sm font-semibold" data-testid={`text-format-name-${i}`}>
                        {fmt.structure_type}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{fmt.count} {t.discover.videoCount.toLowerCase()}</span>
                      </div>
                      <div className="flex items-center justify-end">
                        <TrendScore score={Number(fmt.avg_virality) || 0} size="sm" showLabel />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            {patternsQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : (patternsQuery.data?.patterns || []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(patternsQuery.data?.patterns || []).map((pattern: any, i: number) => {
                  const score = pattern.pattern_score ?? pattern.avg_virality_score;
                  const trendClass = pattern.trend_classification;
                  const trendBadgeClass = trendClass === "rising"
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : trendClass === "stable"
                    ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                    : trendClass === "declining"
                    ? "bg-muted text-muted-foreground border-border"
                    : "";
                  const trendLabel = trendClass === "rising"
                    ? t.discover.rising
                    : trendClass === "stable"
                    ? t.discover.stable
                    : trendClass === "declining"
                    ? t.discover.declining
                    : "";

                  return (
                    <Card key={pattern.pattern_id || i} className="border-border" data-testid={`card-pattern-${pattern.pattern_id || i}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {pattern.pattern_label && (
                              <p className="font-semibold text-foreground text-sm line-clamp-2" data-testid={`text-pattern-label-${i}`}>
                                {pattern.pattern_label}
                              </p>
                            )}
                          </div>
                          {score !== null && score !== undefined && (
                            <TrendScore score={Number(score)} size="sm" />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {pattern.hook_type && (
                            <Badge variant="secondary" className="rounded-full text-[10px]">
                              <Zap className="w-2.5 h-2.5 mr-1" />{formatLabel(pattern.hook_type)}
                            </Badge>
                          )}
                          {pattern.structure_type && (
                            <Badge variant="secondary" className="rounded-full text-[10px]">
                              <Layers className="w-2.5 h-2.5 mr-1" />{formatLabel(pattern.structure_type)}
                            </Badge>
                          )}
                          {pattern.topic_cluster && (
                            <Badge variant="outline" className="rounded-full text-[10px]">
                              {TOPIC_CLUSTER_LABELS[pattern.topic_cluster] || formatLabel(pattern.topic_cluster)}
                            </Badge>
                          )}
                          {trendClass && trendLabel && (
                            <Badge variant="outline" className={`rounded-full text-[10px] ${trendBadgeClass}`} data-testid={`badge-trend-${i}`}>
                              {trendLabel}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {pattern.video_count !== null && pattern.video_count !== undefined && (
                            <span>{pattern.video_count} {t.discover.videoCount.toLowerCase()}</span>
                          )}
                          {pattern.velocity_mid !== null && pattern.velocity_mid !== undefined && (
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{Number(pattern.velocity_mid).toFixed(1)}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => navigate(`/create?hook=${encodeURIComponent(pattern.hook_type || "")}&format=${encodeURIComponent(pattern.structure_type || "")}&topic=${encodeURIComponent(pattern.topic_cluster || "")}`)}
                            data-testid={`button-create-pattern-${pattern.pattern_id || i}`}
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            {t.discover.createWithPattern}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-discover-patterns">
                <Puzzle className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.discover.noPatterns}</h3>
                <p className="text-muted-foreground text-sm">{t.discover.noPatternsDesc}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="creators" className="space-y-4">
            {creatorsQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : allCreators.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground" data-testid="text-creator-count">
                  {t.library.totalResults.replace("{count}", String(creatorTotal))}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allCreators.map((creator: any, i: number) => (
                    <Card key={`${creator.creator_name}-${creator.platform}-${i}`} className="border-border" data-testid={`card-creator-${creator.creator_name}`}>
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
              <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-discover-creators">
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
