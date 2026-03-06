import { DashboardLayout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TrendScore } from "@/components/trend-score";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap, Sparkles, Play, Users, TrendingUp, Video,
  FileText, Eye, Heart, MessageCircle, BarChart3
} from "lucide-react";
import { useState } from "react";

interface Opportunity {
  niche: string;
  hook: string;
  hook_mechanism: string;
  format: string;
  recommended_duration: string;
  trend_score: number;
  video_count: number;
}

interface TrendingHook {
  hook_text: string;
  hook_mechanism_primary: string;
  count: number;
  avg_virality: number;
}

interface TrendingFormat {
  structure_type: string;
  count: number;
  avg_virality: number;
}

interface TopVideo {
  id: number;
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
}

interface EmergingCreator {
  creator_name: string;
  platform: string;
  video_count: number;
  total_views: number;
  avg_virality: number;
  niche: string;
}

interface RadarData {
  metrics: {
    total_videos: number;
    videos_today: number;
    active_niches: number;
    creators_detected: number;
  };
  trending_hooks: TrendingHook[];
  trending_formats: TrendingFormat[];
  top_videos: TopVideo[];
  emerging_creators: EmergingCreator[];
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

function formatNumber(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function TrendRadar() {
  const [, setLocation] = useLocation();
  const [nicheFilter, setNicheFilter] = useState<string>("");

  const nicheParam = nicheFilter || undefined;

  const { data: opportunitiesData, isLoading: oppLoading } = useQuery<{ opportunities: Opportunity[] }>({
    queryKey: ["/api/trends/opportunities"],
  });

  const { data: radarData, isLoading: radarLoading } = useQuery<RadarData>({
    queryKey: ["/api/trends/radar" + (nicheParam ? `?niche=${nicheParam}` : "")],
  });

  const opportunities = opportunitiesData?.opportunities || [];
  const hooks = radarData?.trending_hooks || [];
  const formats = radarData?.trending_formats || [];
  const topVideos = radarData?.top_videos || [];
  const creators = radarData?.emerging_creators || [];
  const maxFormatCount = Math.max(...formats.map((f) => Number(f.count) || 0), 1);

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="page-trend-radar">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Trend Radar</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Discover trending hooks, formats, and viral opportunities.
            </p>
          </div>
          <Select value={nicheFilter} onValueChange={setNicheFilter} data-testid="select-niche-filter">
            <SelectTrigger className="w-48" data-testid="trigger-niche-filter">
              <SelectValue placeholder="All Niches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="option-niche-all">All Niches</SelectItem>
              {Object.keys(nicheColors).map((n) => (
                <SelectItem key={n} value={n} data-testid={`option-niche-${n}`}>
                  {n.charAt(0).toUpperCase() + n.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <section data-testid="section-opportunities">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Daily Viral Opportunities</h2>
          </div>
          {oppLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="min-w-[320px] h-52 rounded-md" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No opportunities detected yet. Add more videos to your niches.
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {opportunities.slice(0, 5).map((opp, i) => (
                <Card key={i} className="min-w-[320px] max-w-[360px] flex-shrink-0" data-testid={`card-opportunity-${i}`}>
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant="outline" className={getNicheColor(opp.niche)} data-testid={`badge-niche-${i}`}>
                        {opp.niche}
                      </Badge>
                      <TrendScore score={opp.trend_score} size="sm" showLabel />
                    </div>
                    <p className="text-sm font-medium line-clamp-2" data-testid={`text-hook-${i}`}>
                      {opp.hook}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" />
                        {opp.format}
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="w-3.5 h-3.5" />
                        {opp.recommended_duration}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setLocation("/script-generator")}
                        data-testid={`button-create-script-${i}`}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        Create Script
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setLocation("/video-builder")}
                        data-testid={`button-create-video-${i}`}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Create Video
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section data-testid="section-trending-hooks">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Trending Hooks</h2>
          </div>
          {radarLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-md" />
              ))}
            </div>
          ) : hooks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No trending hooks detected yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {hooks.map((hook, i) => (
                <Card key={i} data-testid={`card-hook-${i}`}>
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-hook-text-${i}`}>
                        {hook.hook_text}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {hook.hook_mechanism_primary && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-mechanism-${i}`}>
                            {hook.hook_mechanism_primary}
                          </Badge>
                        )}
                        <span>{hook.count} videos</span>
                      </div>
                    </div>
                    <TrendScore score={Number(hook.avg_virality) || 0} size="sm" showLabel />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section data-testid="section-trending-formats">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Trending Formats</h2>
          </div>
          {radarLoading ? (
            <Skeleton className="h-64 rounded-md" />
          ) : formats.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No format data available yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5 space-y-3">
                {formats.map((fmt, i) => {
                  const pct = (Number(fmt.count) / maxFormatCount) * 100;
                  return (
                    <div key={i} data-testid={`row-format-${i}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{fmt.structure_type}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
                          <span>{fmt.count} videos</span>
                          <TrendScore score={Number(fmt.avg_virality) || 0} size="sm" />
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </section>

        <section data-testid="section-top-videos">
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Top Videos Today</h2>
          </div>
          {radarLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-md" />
              ))}
            </div>
          ) : topVideos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No top videos detected yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topVideos.map((vid, i) => (
                <Card key={vid.id || i} data-testid={`card-video-${vid.id || i}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2" data-testid={`text-video-caption-${vid.id}`}>
                          {vid.caption || "Untitled"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {vid.topic_cluster && (
                            <Badge variant="outline" className={`text-xs ${getNicheColor(vid.topic_cluster)}`}>
                              {vid.topic_cluster}
                            </Badge>
                          )}
                          {vid.platform && (
                            <span className="text-xs text-muted-foreground">{vid.platform}</span>
                          )}
                        </div>
                      </div>
                      <TrendScore score={Number(vid.virality_score) || 0} size="sm" />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {vid.creator_name && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {vid.creator_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {formatNumber(vid.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {formatNumber(vid.likes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {formatNumber(vid.comments)}
                      </span>
                    </div>
                    {vid.structure_type && (
                      <div className="text-xs text-muted-foreground">
                        Format: {vid.structure_type}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section data-testid="section-emerging-creators">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Emerging Creators</h2>
          </div>
          {radarLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-md" />
              ))}
            </div>
          ) : creators.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No emerging creators detected yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creators.map((creator, i) => (
                <Card key={i} data-testid={`card-creator-${i}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" data-testid={`text-creator-name-${i}`}>
                          {creator.creator_name}
                        </p>
                        <span className="text-xs text-muted-foreground">{creator.platform}</span>
                      </div>
                      <TrendScore score={Number(creator.avg_virality) || 0} size="sm" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{creator.video_count} videos</span>
                      <span>{formatNumber(Number(creator.total_views))} views</span>
                      {creator.niche && (
                        <Badge variant="outline" className={`text-xs ${getNicheColor(creator.niche)}`}>
                          {creator.niche}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
