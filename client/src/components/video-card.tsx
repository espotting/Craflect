import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Play, TrendingUp } from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import { Globe } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import {
  getPredictedViews,
  getViralityColor,
  formatCompactNumber,
} from "@/lib/predicted-views";

function PlatformIcon({ platform, className }: { platform?: string | null; className?: string }) {
  const cls = className || "w-4 h-4";
  switch (platform) {
    case "tiktok": return <SiTiktok className={cls} />;
    case "instagram": return <SiInstagram className={cls} />;
    case "youtube": return <SiYoutube className={cls} />;
    default: return <Globe className={cls} />;
  }
}

const gradients = [
  "from-violet-600 to-indigo-700",
  "from-pink-600 to-rose-700",
  "from-cyan-600 to-blue-700",
  "from-emerald-600 to-teal-700",
  "from-amber-600 to-orange-700",
  "from-fuchsia-600 to-purple-700",
];

function getGradient(id: number | string): string {
  const idx = typeof id === "number" ? id : (id?.toString().charCodeAt(0) || 0);
  return gradients[idx % gradients.length];
}

function formatLabel(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export interface VideoCardData {
  id: number | string;
  caption?: string | null;
  hookText?: string | null;
  hook?: string | null;
  platform?: string | null;
  views?: number | null;
  viralityScore?: number | null;
  contentFormat?: string | null;
  format?: string | null;
  thumbnailUrl?: string | null;
  topicCluster?: string | null;
}

interface VideoCardProps {
  video: VideoCardData;
  compact?: boolean;
}

export function VideoCard({ video, compact = false }: VideoCardProps) {
  const [, navigate] = useLocation();
  const { t } = useLanguage();

  const hookDisplay = video.hookText || video.hook || video.caption || "—";
  const formatDisplay = video.contentFormat || video.format;
  const predicted = getPredictedViews(video.viralityScore);
  const viralityColorClass = getViralityColor(video.viralityScore);
  const gradient = getGradient(video.id);

  const handleCreateVideo = () => {
    const params = new URLSearchParams();
    if (video.hookText || video.hook) params.set("hook", (video.hookText || video.hook) as string);
    if (formatDisplay) params.set("format", formatDisplay);
    if (video.topicCluster) params.set("topic", video.topicCluster);
    navigate(`/create?${params.toString()}`);
  };

  if (compact) {
    return (
      <Card
        className="group cursor-pointer flex-shrink-0 overflow-visible transition-transform duration-200 hover:scale-[1.02]"
        style={{ width: "180px" }}
        data-testid={`card-video-compact-${video.id}`}
      >
        <div className={`relative aspect-[9/16] rounded-t-md bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-t-md"
            />
          ) : (
            <PlatformIcon platform={video.platform} className="w-8 h-8 text-white/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-t-md" />
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-white text-xs font-medium line-clamp-2 leading-tight" data-testid={`text-hook-compact-${video.id}`}>
              {hookDisplay}
            </p>
          </div>
          {video.viralityScore != null && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${viralityColorClass}`} data-testid={`badge-virality-compact-${video.id}`}>
                {Math.round(video.viralityScore)}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-2 space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="w-3 h-3" />
            <span className="text-[10px]" data-testid={`text-predicted-compact-${video.id}`}>{predicted.label}</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="group overflow-visible transition-transform duration-200 hover:scale-[1.02]"
      data-testid={`card-video-${video.id}`}
    >
      <div className={`relative aspect-[9/16] rounded-t-md bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover rounded-t-md"
          />
        ) : (
          <PlatformIcon platform={video.platform} className="w-10 h-10 text-white/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-t-md" />

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <PlatformIcon platform={video.platform} className="w-4 h-4 text-white/70" />
          {video.viralityScore != null && (
            <Badge variant="secondary" className={`text-xs ${viralityColorClass}`} data-testid={`badge-virality-${video.id}`}>
              <TrendingUp className="w-3 h-3 mr-1" />
              {Math.round(video.viralityScore)}
            </Badge>
          )}
        </div>

        <div className="absolute bottom-3 left-3 right-3 space-y-2">
          <p className="text-white text-sm font-medium line-clamp-3 leading-snug" data-testid={`text-hook-${video.id}`}>
            {hookDisplay}
          </p>
          <div className="flex items-center flex-wrap gap-2">
            {formatDisplay && (
              <Badge variant="outline" className="text-[10px] text-white/80 border-white/30 bg-white/10" data-testid={`badge-format-${video.id}`}>
                {formatLabel(formatDisplay)}
              </Badge>
            )}
            {video.views != null && (
              <span className="text-[11px] text-white/70 flex items-center gap-1" data-testid={`text-views-${video.id}`}>
                <Eye className="w-3 h-3" />
                {formatCompactNumber(video.views)}
              </span>
            )}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-xs font-medium" data-testid={`text-predicted-${video.id}`}>{predicted.label}</span>
          </div>
          {video.topicCluster && (
            <Badge variant="outline" className="text-[10px]" data-testid={`badge-topic-${video.id}`}>
              {formatLabel(video.topicCluster)}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={handleCreateVideo}
          data-testid={`button-create-from-video-${video.id}`}
        >
          {t.opportunities?.createVideo || t.dashboard?.createVideo || "Create Video"}
        </Button>
      </div>
    </Card>
  );
}
