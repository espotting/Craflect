import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout";
import { TrendScore } from "@/components/trend-score";
import { Card } from "@/components/ui/card";
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
import {
  Eye,
  Heart,
  Percent,
  FileText,
  Video,
  ChevronLeft,
  ChevronRight,
  Filter,
  TrendingUp,
} from "lucide-react";

interface BrowseVideo {
  id: string;
  caption: string | null;
  platform: string | null;
  creator_name: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  engagement_rate: number | null;
  virality_score: number | null;
  topic_cluster: string | null;
  structure_type: string | null;
  hook_mechanism_primary: string | null;
  hook_text: string | null;
  duration_bucket: string | null;
  classified_at: string | null;
  view_velocity: number | null;
  thumbnail_url: string | null;
}

interface BrowseResponse {
  videos: BrowseVideo[];
  total: number;
  page: number;
  pages: number;
}

const PLATFORMS = ["tiktok", "youtube", "instagram", "twitter"] as const;

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return "No caption";
  if (str.length <= max) return str;
  return str.slice(0, max) + "...";
}

function platformColor(platform: string | null): string {
  switch (platform?.toLowerCase()) {
    case "tiktok":
      return "bg-pink-500/15 text-pink-400 border-pink-500/30";
    case "youtube":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "instagram":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "twitter":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function Videos() {
  const [, setLocation] = useLocation();
  const [niche, setNiche] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryParams = new URLSearchParams();
  if (niche !== "all") queryParams.set("niche", niche);
  if (platform !== "all") queryParams.set("platform", platform);
  queryParams.set("page", page.toString());
  queryParams.set("limit", limit.toString());

  const { data, isLoading } = useQuery<BrowseResponse>({
    queryKey: ["/api/videos/browse?" + queryParams.toString()],
  });

  const videos = data?.videos ?? [];
  const totalPages = data?.pages ?? 1;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-videos">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Videos
          </h1>
          <p className="text-muted-foreground text-sm">
            Browse and filter analyzed videos from the intelligence engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3" data-testid="filters-bar">
          <Filter className="w-4 h-4 text-muted-foreground" />

          <Select
            value={niche}
            onValueChange={(v) => {
              setNiche(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-niche">
              <SelectValue placeholder="All niches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All niches</SelectItem>
              {TOPIC_CLUSTERS.map((tc) => (
                <SelectItem key={tc} value={tc}>
                  {TOPIC_CLUSTER_LABELS[tc] || tc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={platform}
            onValueChange={(v) => {
              setPlatform(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]" data-testid="select-platform">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {data && (
            <span className="text-xs text-muted-foreground ml-auto" data-testid="text-total-count">
              {data.total} video{data.total !== 1 ? "s" : ""} found
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="loading-skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </Card>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <Card className="p-8 text-center" data-testid="empty-state">
            <p className="text-muted-foreground">No videos found for the selected filters.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="videos-grid">
            {videos.map((video) => (
              <Card
                key={video.id}
                className="p-4 space-y-3"
                data-testid={`card-video-${video.id}`}
              >
                {video.thumbnail_url && (
                  <div className="w-full aspect-video rounded-md overflow-hidden bg-muted" data-testid={`thumbnail-${video.id}`}>
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {video.platform && (
                    <Badge
                      variant="outline"
                      className={platformColor(video.platform)}
                      data-testid={`badge-platform-${video.id}`}
                    >
                      {video.platform}
                    </Badge>
                  )}
                  {video.topic_cluster && (
                    <Badge
                      variant="secondary"
                      data-testid={`badge-niche-${video.id}`}
                    >
                      {TOPIC_CLUSTER_LABELS[video.topic_cluster] || video.topic_cluster}
                    </Badge>
                  )}
                  {video.duration_bucket && (
                    <span className="text-xs text-muted-foreground">
                      {video.duration_bucket}
                    </span>
                  )}
                </div>

                <div>
                  {video.creator_name && (
                    <p
                      className="text-sm font-medium text-foreground"
                      data-testid={`text-creator-${video.id}`}
                    >
                      {video.creator_name}
                    </p>
                  )}
                  <p
                    className="text-sm text-muted-foreground mt-1 leading-relaxed"
                    data-testid={`text-caption-${video.id}`}
                  >
                    {truncate(video.caption, 120)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1" data-testid={`stat-views-${video.id}`}>
                    <Eye className="w-3.5 h-3.5" />
                    {formatNumber(video.views)}
                  </span>
                  <span className="flex items-center gap-1" data-testid={`stat-likes-${video.id}`}>
                    <Heart className="w-3.5 h-3.5" />
                    {formatNumber(video.likes)}
                  </span>
                  <span className="flex items-center gap-1" data-testid={`stat-engagement-${video.id}`}>
                    <Percent className="w-3.5 h-3.5" />
                    {video.engagement_rate != null
                      ? `${(video.engagement_rate * 100).toFixed(2)}%`
                      : "—"}
                  </span>
                  {video.view_velocity != null && (
                    <span className="flex items-center gap-1 text-emerald-400" data-testid={`stat-velocity-${video.id}`}>
                      <TrendingUp className="w-3.5 h-3.5" />
                      {formatNumber(video.view_velocity)}/h
                    </span>
                  )}
                  {video.virality_score != null && (
                    <TrendScore
                      score={video.virality_score}
                      size="sm"
                      showLabel
                      data-testid={`score-virality-${video.id}`}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {video.structure_type && (
                    <Badge variant="outline" className="text-xs" data-testid={`badge-structure-${video.id}`}>
                      {video.structure_type.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {video.hook_mechanism_primary && (
                    <Badge variant="outline" className="text-xs" data-testid={`badge-hook-${video.id}`}>
                      {video.hook_mechanism_primary.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation("/script-generator")}
                    data-testid={`button-create-script-${video.id}`}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Create Script
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation("/video-builder")}
                    data-testid={`button-create-video-${video.id}`}
                  >
                    <Video className="w-3.5 h-3.5 mr-1.5" />
                    Create Video
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div
            className="flex items-center justify-center gap-2 pt-2"
            data-testid="pagination"
          >
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-3" data-testid="text-page-info">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
