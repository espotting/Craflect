import { DashboardLayout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendScore } from "@/components/trend-score";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TOPIC_CLUSTERS, TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Users } from "lucide-react";

interface Creator {
  creator_name: string;
  platform: string;
  video_count: string;
  views_total: string;
  avg_views: string;
  avg_virality: string;
  avg_engagement: string;
  niche: string | null;
  viral_videos: string;
}

function formatViews(value: string | number | null): string {
  const num = typeof value === "string" ? parseInt(value) : value;
  if (!num || isNaN(num)) return "0";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function platformColor(platform: string): string {
  const p = platform?.toLowerCase();
  if (p === "tiktok") return "bg-pink-500/15 text-pink-500 border-pink-500/30";
  if (p === "youtube") return "bg-red-500/15 text-red-500 border-red-500/30";
  if (p === "instagram") return "bg-purple-500/15 text-purple-500 border-purple-500/30";
  return "bg-muted text-muted-foreground";
}

export default function Creators() {
  const [nicheFilter, setNicheFilter] = useState<string>("all");

  const queryNiche = nicheFilter === "all" ? undefined : nicheFilter;

  const { data, isLoading } = useQuery<{ creators: Creator[] }>({
    queryKey: ["/api/creators" + (queryNiche ? `?niche=${queryNiche}` : "")],
  });

  const creators = data?.creators ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-creators">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Creators</h1>
              <p className="text-sm text-muted-foreground">Top creators ranked by virality score</p>
            </div>
          </div>

          <Select value={nicheFilter} onValueChange={setNicheFilter} data-testid="select-niche-filter">
            <SelectTrigger className="w-[200px]" data-testid="trigger-niche-filter">
              <SelectValue placeholder="All niches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="option-niche-all">All niches</SelectItem>
              {TOPIC_CLUSTERS.map((cluster) => (
                <SelectItem key={cluster} value={cluster} data-testid={`option-niche-${cluster}`}>
                  {TOPIC_CLUSTER_LABELS[cluster] || cluster}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-md" data-testid="table-creators">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Videos</TableHead>
                <TableHead className="text-right">Total Views</TableHead>
                <TableHead>Virality</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
                <TableHead className="text-right">Viral Videos</TableHead>
                <TableHead>Niche</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : creators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No creators found{queryNiche ? ` for niche "${TOPIC_CLUSTER_LABELS[queryNiche] || queryNiche}"` : ""}.
                  </TableCell>
                </TableRow>
              ) : (
                creators.map((creator, index) => {
                  const engagement = parseFloat(creator.avg_engagement) || 0;
                  const virality = parseFloat(creator.avg_virality) || 0;
                  const nicheLabel = creator.niche ? (TOPIC_CLUSTER_LABELS[creator.niche] || creator.niche) : null;

                  return (
                    <TableRow key={`${creator.creator_name}-${creator.platform}-${index}`} data-testid={`row-creator-${index}`}>
                      <TableCell className="font-medium" data-testid={`text-creator-name-${index}`}>
                        {creator.creator_name}
                      </TableCell>
                      <TableCell data-testid={`badge-platform-${index}`}>
                        <Badge variant="outline" className={`text-xs ${platformColor(creator.platform)}`}>
                          {creator.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums" data-testid={`text-video-count-${index}`}>
                        {parseInt(creator.video_count).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums" data-testid={`text-views-total-${index}`}>
                        {formatViews(creator.views_total)}
                      </TableCell>
                      <TableCell data-testid={`score-virality-${index}`}>
                        <TrendScore score={virality} size="sm" />
                      </TableCell>
                      <TableCell className="text-right tabular-nums" data-testid={`text-engagement-${index}`}>
                        {(engagement * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums" data-testid={`text-viral-videos-${index}`}>
                        {parseInt(creator.viral_videos).toLocaleString()}
                      </TableCell>
                      <TableCell data-testid={`badge-niche-${index}`}>
                        {nicheLabel ? (
                          <Badge variant="secondary" className="text-xs">
                            {nicheLabel}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && creators.length > 0 && (
          <p className="text-xs text-muted-foreground" data-testid="text-creator-count">
            Showing {creators.length} creator{creators.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
