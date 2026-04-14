import { useState } from "react";
import { useLocation } from "wouter";

// ── Shared constants ──────────────────────────────────────────────────────────

export const NICHE_LABELS: Record<string, string> = {
  finance: 'Finance', ai_tools: 'AI Tools', online_business: 'Online Business',
  productivity: 'Productivity', content_creation: 'Content Creation',
  health_wellness: 'Health & Wellness', fitness: 'Fitness',
  mindset: 'Mindset', digital_marketing: 'Digital Marketing', real_estate: 'Real Estate',
};

export const NICHE_EMOJIS: Record<string, string> = {
  finance: '💰', ai_tools: '🤖', online_business: '📈', productivity: '✅',
  content_creation: '🎬', health_wellness: '🌿', fitness: '💪',
  mindset: '🧠', digital_marketing: '📱', real_estate: '🏠',
};

export const NICHE_GRADIENTS: Record<string, string> = {
  finance: 'linear-gradient(145deg,#1e3a8a,#2563eb,#0369a1)',
  ai_tools: 'linear-gradient(145deg,#4c1d95,#6d28d9,#7c3aed)',
  online_business: 'linear-gradient(145deg,#7c2d12,#c2410c,#ea580c)',
  productivity: 'linear-gradient(145deg,#064e3b,#065f46,#059669)',
  content_creation: 'linear-gradient(145deg,#1e1b4b,#312e81,#3730a3)',
  health_wellness: 'linear-gradient(145deg,#0f4c75,#1b6ca8,#4cb8c4)',
  fitness: 'linear-gradient(145deg,#1a1a2e,#16213e,#e94560)',
  mindset: 'linear-gradient(145deg,#2d1b69,#065f46,#059669)',
  digital_marketing: 'linear-gradient(145deg,#141e30,#243b55,#7c5cff)',
  real_estate: 'linear-gradient(145deg,#134e5e,#71b280,#f7971e)',
  default: 'linear-gradient(145deg,#1e1b4b,#4338ca,#6d28d9)',
};

export function formatViews(min: number, max: number): string {
  const fmt = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : Math.round(n / 1000) + 'K';
  return fmt(min) + ' – ' + fmt(max);
}

export function renderHookWithVars(template: string): React.ReactNode {
  if (!template) return null;
  const parts = template.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    part.match(/^\[.*\]$/) ? (
      <em key={i} style={{ color: '#a78bfa', fontStyle: 'normal', background: 'rgba(124,92,255,0.12)', padding: '1px 5px', borderRadius: 3 }}>
        {part}
      </em>
    ) : part
  );
}

// ── VideoCard ─────────────────────────────────────────────────────────────────

export function VideoCard({ video, niche }: { video: any; niche: string }) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);

  const gradient = NICHE_GRADIENTS[video.niche_cluster || niche] || NICHE_GRADIENTS.default;
  const emoji = NICHE_EMOJIS[video.niche_cluster || niche] || '🎯';
  const isEmerging = video.trend_status === 'emerging';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate('/video/' + video.id)}
      style={{
        flex: '0 0 150px', borderRadius: 11, overflow: 'hidden', cursor: 'pointer',
        border: '1px solid ' + (hovered ? 'rgba(124,92,255,0.3)' : 'rgba(255,255,255,0.06)'),
        transform: hovered ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.2s, border-color 0.2s',
        position: 'relative', zIndex: hovered ? 3 : 1,
      }}
    >
      {/* Thumbnail */}
      <div style={{ height: 195, position: 'relative' }}>
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            alt=""
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', background: gradient,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: 10, textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, marginBottom: 7 }}>{emoji}</div>
            <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
              {(video.hook_text || '').substring(0, 50)}
            </div>
          </div>
        )}

        {/* Badge trend */}
        <div style={{
          position: 'absolute', top: 6, left: 6, fontSize: 7, fontWeight: 800,
          padding: '2px 6px', borderRadius: 5, letterSpacing: '0.04em',
          background: isEmerging ? 'rgba(239,68,68,0.88)' : 'rgba(124,92,255,0.88)',
          color: '#fff',
        }}>
          {isEmerging ? '🔥 EMERGING' : '⚡ TRENDING'}
        </div>

        {/* Score */}
        <div style={{
          position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.68)',
          color: '#a78bfa', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 5,
        }}>
          {Math.round(video.virality_score || 0)}
        </div>

        {/* Hover overlay */}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 6, padding: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>
              {video.predicted_views_min && video.predicted_views_max
                ? formatViews(video.predicted_views_min, video.predicted_views_max) + ' views'
                : '500K+ views'}
            </div>
            <div style={{ fontSize: 10, color: '#f59e0b' }}>
              ⭐ {Math.round(video.confidence_score || 75)}% confiance
            </div>
            <button
              onClick={e => { e.stopPropagation(); navigate('/video/' + video.id); }}
              style={{
                background: 'rgba(124,92,255,0.9)', border: 'none', color: '#fff',
                padding: '7px 14px', borderRadius: 7, fontSize: 10, fontWeight: 700,
                cursor: 'pointer', width: 120, textAlign: 'center',
              }}
            >
              En savoir plus →
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px', background: '#0c0c18' }}>
        <div style={{
          fontSize: 7, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 2,
        }}>
          {NICHE_LABELS[video.niche_cluster] || video.niche_cluster} · {video.hook_type_v2 || 'Hook'}
        </div>
        <div style={{
          fontSize: 9, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
        }}>
          {video.hook_text || ''}
        </div>
      </div>
    </div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div style={{
      flex: '0 0 150px', borderRadius: 11, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ height: 195, background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ padding: '8px 10px', background: '#0c0c18' }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 5 }} />
        <div style={{ height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }} />
      </div>
    </div>
  );
}
