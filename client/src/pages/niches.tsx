import { DashboardLayout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { TrendScore } from "@/components/trend-score";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Video, Zap, Users } from "lucide-react";

interface NicheOverviewItem {
  niche: string;
  video_count: number;
  avg_virality: number;
  avg_engagement: number;
  top_hooks: { hook_mechanism_primary: string; count: string }[];
  top_formats: { structure_type: string; count: string }[];
  top_creators: { creator_name: string; video_count: string; avg_virality: string }[];
}

export default function Niches() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ niches: NicheOverviewItem[] }>({
    queryKey: ["/api/niches/overview"],
  });

  const niches = data?.niches ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-niches">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Niches</h1>
          <p className="text-muted-foreground text-sm mt-1">Explore content patterns across niches</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="niches-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-md" />
            ))}
          </div>
        ) : niches.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground" data-testid="niches-empty">
            No niche data available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="niches-grid">
            {niches.map((niche) => {
              const label = TOPIC_CLUSTER_LABELS[niche.niche] || niche.niche;
              const hooks = niche.top_hooks.slice(0, 3);
              const formats = niche.top_formats.slice(0, 3);
              const creators = niche.top_creators.slice(0, 3);

              return (
                <Card
                  key={niche.niche}
                  className="p-5 cursor-pointer hover-elevate active-elevate-2 space-y-4"
                  data-testid={`card-niche-${niche.niche}`}
                  onClick={() => setLocation(`/niche-data?niche=${niche.niche}`)}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-base" data-testid={`text-niche-name-${niche.niche}`}>
                      {label}
                    </h3>
                    <TrendScore score={niche.avg_virality} size="sm" showLabel data-testid={`trend-score-niche-${niche.niche}`} />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1" data-testid={`text-video-count-${niche.niche}`}>
                      <Video className="w-3.5 h-3.5" />
                      {niche.video_count} videos
                    </span>
                    <span className="flex items-center gap-1" data-testid={`text-engagement-${niche.niche}`}>
                      <Zap className="w-3.5 h-3.5" />
                      {(niche.avg_engagement * 100).toFixed(1)}% eng.
                    </span>
                  </div>

                  {hooks.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Top Hooks</span>
                      <div className="flex flex-wrap gap-1.5">
                        {hooks.map((h) => (
                          <Badge
                            key={h.hook_mechanism_primary}
                            variant="secondary"
                            className="text-[11px]"
                            data-testid={`badge-hook-${niche.niche}-${h.hook_mechanism_primary}`}
                          >
                            {h.hook_mechanism_primary.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {formats.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Top Formats</span>
                      <div className="flex flex-wrap gap-1.5">
                        {formats.map((f) => (
                          <Badge
                            key={f.structure_type}
                            variant="outline"
                            className="text-[11px]"
                            data-testid={`badge-format-${niche.niche}-${f.structure_type}`}
                          >
                            {f.structure_type.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {creators.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Top Creators
                      </span>
                      <ul className="space-y-1">
                        {creators.map((c) => (
                          <li
                            key={c.creator_name}
                            className="text-xs flex items-center justify-between gap-2"
                            data-testid={`text-creator-${niche.niche}-${c.creator_name}`}
                          >
                            <span className="truncate text-foreground/80">{c.creator_name}</span>
                            <span className="text-muted-foreground shrink-0">{c.video_count} vids</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
