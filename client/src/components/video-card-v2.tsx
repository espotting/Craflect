import { useState } from "react";
import { Play, Eye, Sparkles, BarChart3, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViralityBadge } from "./virality-badge";
import { useLanguage } from "@/hooks/use-language";

export interface VideoCardData {
  id: string;
  thumbnail?: string;
  hook: string;
  views: string;
  format: string;
  viralityScore: number;
  platform?: string;
  creator?: string;
}

interface VideoCardV2Props {
  video: VideoCardData;
  compact?: boolean;
  onCreateSimilar?: (video: VideoCardData) => void;
  onAnalyze?: (video: VideoCardData) => void;
  onSave?: (video: VideoCardData) => void;
}

const gradients = [
  "from-violet-600 via-purple-600 to-fuchsia-600",
  "from-blue-600 via-cyan-600 to-teal-600",
  "from-orange-600 via-amber-600 to-yellow-600",
  "from-rose-600 via-pink-600 to-purple-600",
];

function getGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return gradients[Math.abs(hash) % gradients.length];
}

export function VideoCardV2({ video, compact = false, onCreateSimilar, onAnalyze, onSave }: VideoCardV2Props) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useLanguage();
  const gradient = getGradient(video.id);

  if (compact) {
    return (
      <div
        className="group relative bg-slate-900/50 rounded-xl overflow-hidden border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer"
        data-testid={`video-card-compact-${video.id}`}
      >
        <div className={`relative aspect-[9/16] bg-gradient-to-br ${gradient} overflow-hidden`}>
          {video.thumbnail && (
            <img
              src={video.thumbnail}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              loading="lazy"
              alt=""
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {video.platform && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] rounded-full capitalize">
                {video.platform}
              </span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <ViralityBadge score={video.viralityScore} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white font-medium text-xs line-clamp-2">{video.hook}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`video-card-${video.id}`}
    >
      <div className={`relative aspect-[9/16] bg-gradient-to-br ${gradient} overflow-hidden`}>
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            loading="lazy"
            alt=""
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {video.platform && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full capitalize">
              {video.platform}
            </span>
          </div>
        )}

        <div className="absolute top-3 right-3">
          <ViralityBadge score={video.viralityScore} />
        </div>

        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
        >
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white w-36"
            onClick={(e) => { e.stopPropagation(); onCreateSimilar?.(video); }}
            data-testid={`button-create-similar-${video.id}`}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t.studio?.hover?.createSimilar || "Create Similar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/20 w-36"
            onClick={(e) => { e.stopPropagation(); onAnalyze?.(video); }}
            data-testid={`button-analyze-${video.id}`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {t.studio?.hover?.analyze || "Analyze"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/20 w-36"
            onClick={(e) => { e.stopPropagation(); onSave?.(video); }}
            data-testid={`button-save-${video.id}`}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            {t.studio?.hover?.save || "Save"}
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-semibold text-sm line-clamp-2 leading-tight">{video.hook}</p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 capitalize">{video.format?.replace(/_/g, " ")}</span>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Eye className="w-3 h-3" />
            {video.views}
          </div>
        </div>
        {video.creator && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-xs text-slate-300">{video.creator[0]?.toUpperCase()}</span>
            </div>
            <span className="text-xs text-slate-400">{video.creator}</span>
          </div>
        )}
      </div>
    </div>
  );
}
