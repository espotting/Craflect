import { DashboardLayout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { TrendScore } from "@/components/trend-score";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, TrendingUp, BarChart3
} from "lucide-react";
import { useState } from "react";

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

interface EmergingTrend {
  topic_cluster: string;
  hook_mechanism_primary: string;
  structure_type: string;
  video_count: number;
  avg_virality: number;
  latest_at: string;
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
  top_videos: unknown[];
  emerging_creators: unknown[];
  emerging_trends: EmergingTrend[];
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

export default function TrendRadar() {
  const [nicheFilter, setNicheFilter] = useState<string>("");

  const nicheParam = (nicheFilter && nicheFilter !== "all") ? nicheFilter : undefined;

  const { data: radarData, isLoading: radarLoading } = useQuery<RadarData>({
    queryKey: ["/api/trends/radar" + (nicheParam ? `?niche=${nicheParam}` : "")],
  });

  const hooks = radarData?.trending_hooks || [];
  const formats = radarData?.trending_formats || [];
  const emergingTrends = radarData?.emerging_trends || [];

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="page-trend-radar">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Trend Radar</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Discover emerging trends, trending hooks, and popular formats.
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

        <section data-testid="section-emerging-trends">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Emerging Trends</h2>
          </div>
          {radarLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-md" />
              ))}
            </div>
          ) : emergingTrends.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No emerging trends detected yet. Check back as more data is analyzed.
              </CardContent>
            </Card>
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
                      <span>{trend.video_count} videos</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-md" />
              ))}
            </div>
          ) : hooks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No trending hooks detected yet.
              </CardContent>
            </Card>
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
                      <span className="text-xs text-muted-foreground">{hook.count} videos</span>
                    </div>
                    <div className="flex items-center justify-end">
                      <TrendScore score={Number(hook.avg_virality) || 0} size="sm" showLabel />
                    </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-md" />
              ))}
            </div>
          ) : formats.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No format data available yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formats.map((fmt, i) => (
                <Card key={i} data-testid={`card-format-${i}`}>
                  <CardContent className="p-5 space-y-3">
                    <p className="text-sm font-semibold" data-testid={`text-format-name-${i}`}>
                      {fmt.structure_type}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{fmt.count} videos</span>
                    </div>
                    <div className="flex items-center justify-end">
                      <TrendScore score={Number(fmt.avg_virality) || 0} size="sm" showLabel />
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
