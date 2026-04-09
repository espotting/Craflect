import { useState } from "react";
import { Eye, Sparkles, BarChart3, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViralityBadge } from "./virality-badge";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";

export interface VideoCardData {
  id: string;
  thumbnail?: string;
  hook: string;
  views: string;
  format: string;
  viralityScore: number;
  platform?: string;
  creator?: string;
  trendStatus?: 'emerging' | 'trending' | 'stable' | 'declining';
  velocity7d?: number;
  followersCount?: number;
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

function getViralityBarColor(score: number): string {
  if (score >= 80) return 'linear-gradient(90deg, #7C5CFF, #c026d3)';
  if (score >= 60) return '#7C5CFF';
  if (score >= 40) return '#3b82f6';
  return '#64748b';
}

function VelocityBadge({ trendStatus }: { trendStatus?: string }) {
  if (trendStatus === 'emerging') {
    return (
      <div style={{
        position: 'absolute', top: 8, right: 8,
        background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444',
        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
        color: '#ef4444', backdropFilter: 'blur(4px)', zIndex: 10,
      }}>🔥 Emerging</div>
    );
  }
  if (trendStatus === 'trending') {
    return (
      <div style={{
        position: 'absolute', top: 8, right: 8,
        background: 'rgba(124,92,255,0.15)', border: '1px solid #7C5CFF',
        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
        color: '#7C5CFF', backdropFilter: 'blur(4px)', zIndex: 10,
      }}>⚡ Trending</div>
    );
  }
  return null;
}

export function VideoCardV2({ video, compact = false, onCreateSimilar, onAnalyze, onSave }: VideoCardV2Props) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const gradient = getGradient(video.id);
  const viralityBarColor = getViralityBarColor(video.viralityScore);

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
          <VelocityBadge trendStatus={video.trendStatus} />
          {!video.trendStatus && (
            <div className="absolute top-2 right-2">
              <ViralityBadge score={video.viralityScore} />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white font-medium text-xs line-clamp-2">{video.hook}</p>
          </div>
          {/* Virality bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)' }}>
            <div style={{
              width: `${Math.min(100, video.viralityScore)}%`, height: '100%',
              background: viralityBarColor, transition: 'width 0.3s ease'
            }} />
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

        <VelocityBadge trendStatus={video.trendStatus} />
        {!video.trendStatus && (
          <div className="absolute top-3 right-3">
            <ViralityBadge score={video.viralityScore} />
          </div>
        )}

        {/* Hover overlay */}
        {isHovered && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 10, borderRadius: 'inherit',
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/create?videoId=' + video.id); }}
              style={{
                background: '#7C5CFF', color: '#fff', border: 'none',
                padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
              data-testid={`button-create-similar-${video.id}`}
            >
              <Sparkles style={{ width: 14, height: 14 }} />
              {t.studio?.hover?.createSimilar || "Use in Studio"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAnalyze?.(video); }}
              style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '8px 20px', borderRadius: 8, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
              data-testid={`button-analyze-${video.id}`}
            >
              <BarChart3 style={{ width: 14, height: 14 }} />
              {t.studio?.hover?.analyze || "Analyze"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSave?.(video); }}
              style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '8px 20px', borderRadius: 8, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
              data-testid={`button-save-${video.id}`}
            >
              <Bookmark style={{ width: 14, height: 14 }} />
              {t.studio?.hover?.save || "Save"}
            </button>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-semibold text-sm line-clamp-2 leading-tight">{video.hook}</p>
        </div>

        {/* Virality bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)' }}>
          <div style={{
            width: `${Math.min(100, video.viralityScore)}%`, height: '100%',
            background: viralityBarColor, transition: 'width 0.3s ease'
          }} />
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
