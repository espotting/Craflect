import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout";
import { TrendScore } from "@/components/trend-score";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOPIC_CLUSTERS, TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Layers, Eye, FileText, Video, Sparkles } from "lucide-react";

interface ExampleVideo {
  id: string;
  caption: string | null;
  views: number | null;
  virality_score: number | null;
}

interface PatternItem {
  pattern_hook: string;
  content_format: string;
  niche: string | null;
  platform: string | null;
  video_count: number;
  growth_score: number | null;
  avg_engagement: number | null;
  example_videos: ExampleVideo[];
}

interface PatternsResponse {
  patterns: PatternItem[];
}

function formatViews(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatEngagement(rate: number | null): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(2)}%`;
}

function formatLabel(s: string | null): string {
  if (!s) return "—";
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Patterns() {
  const [selectedNiche, setSelectedNiche] = useState<string>("all");

  const nicheParam = selectedNiche === "all" ? "" : selectedNiche;
  const queryKey = nicheParam
    ? ["/api/patterns/browse", `?niche=${nicheParam}`]
    : ["/api/patterns/browse"];

  const { data, isLoading } = useQuery<PatternsResponse>({
    queryKey,
  });

  const patterns = data?.patterns ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-patterns">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Patterns
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Viral patterns and content strategies detected across niches.
            </p>
          </div>
          <Select
            value={selectedNiche}
            onValueChange={setSelectedNiche}
          >
            <SelectTrigger
              className="w-[220px]"
              data-testid="select-niche-filter"
            >
              <SelectValue placeholder="Filter by niche" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="select-niche-all">
                All niches
              </SelectItem>
              {TOPIC_CLUSTERS.map((cluster) => (
                <SelectItem
                  key={cluster}
                  value={cluster}
                  data-testid={`select-niche-${cluster}`}
                >
                  {TOPIC_CLUSTER_LABELS[cluster] ?? formatLabel(cluster)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2" data-testid="patterns-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : patterns.length === 0 ? (
          <Card data-testid="patterns-empty">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                No patterns found for this filter.
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Try selecting a different niche or check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2" data-testid="patterns-grid">
            {patterns.map((pattern, index) => (
              <Card
                key={`${pattern.pattern_hook}-${pattern.content_format}-${pattern.niche}-${pattern.platform}-${index}`}
                data-testid={`card-pattern-${index}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base leading-tight" data-testid={`text-hook-${index}`}>
                      <Sparkles className="inline-block w-4 h-4 mr-1.5 text-primary" />
                      {formatLabel(pattern.pattern_hook)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground" data-testid={`text-format-${index}`}>
                      {formatLabel(pattern.content_format)}
                    </p>
                  </div>
                  {pattern.growth_score != null && (
                    <TrendScore
                      score={pattern.growth_score}
                      size="sm"
                      showLabel
                      data-testid={`trend-score-pattern-${index}`}
                    />
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {pattern.niche && (
                      <Badge variant="secondary" data-testid={`badge-niche-${index}`}>
                        {TOPIC_CLUSTER_LABELS[pattern.niche] ?? formatLabel(pattern.niche)}
                      </Badge>
                    )}
                    {pattern.platform && (
                      <Badge variant="outline" data-testid={`badge-platform-${index}`}>
                        {formatLabel(pattern.platform)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground" data-testid={`text-video-count-${index}`}>
                      <Video className="w-3.5 h-3.5" />
                      <span>{pattern.video_count} videos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground" data-testid={`text-engagement-${index}`}>
                      <Eye className="w-3.5 h-3.5" />
                      <span>{formatEngagement(pattern.avg_engagement)} eng.</span>
                    </div>
                  </div>

                  {pattern.example_videos && pattern.example_videos.length > 0 && (
                    <div className="space-y-2" data-testid={`example-videos-${index}`}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Top examples
                      </p>
                      <div className="space-y-1.5">
                        {pattern.example_videos.slice(0, 3).map((video, vi) => (
                          <div
                            key={video.id}
                            className="flex items-center justify-between gap-2 text-sm rounded-md px-2.5 py-1.5 bg-muted/50"
                            data-testid={`example-video-${index}-${vi}`}
                          >
                            <span className="truncate text-foreground/80 flex-1 min-w-0">
                              {video.caption || "Untitled"}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatViews(video.views)} views
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Link href="/script-generator">
                      <Button variant="outline" size="sm" data-testid={`button-create-script-${index}`}>
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        Create Script
                      </Button>
                    </Link>
                    <Link href="/video-builder">
                      <Button variant="outline" size="sm" data-testid={`button-create-video-${index}`}>
                        <Video className="w-3.5 h-3.5 mr-1.5" />
                        Create Video
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
