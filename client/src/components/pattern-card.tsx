import { useState } from "react";
import { useLocation } from "wouter";
import { renderHookWithVars, formatViews } from "./video-card-v3";

export interface PatternCardPattern {
  pattern_id: string;
  hook_template: string | null;
  why_it_works: string | null;
  signal_strength: 'strong' | 'building' | 'emerging';
  video_count: number | null;
  predicted_views_min: number | null;
  predicted_views_max: number | null;
  velocity_7d: number | null;
  topic_cluster: string | null;
  platform: string | null;
  confidence_score: number | null;
}

const SIGNAL_CONFIG = {
  strong:   { label: 'Strong',   color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.25)' },
  building: { label: 'Building', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  emerging: { label: 'Emerging', color: '#a78bfa', bg: 'rgba(124,92,255,0.10)', border: 'rgba(124,92,255,0.20)' },
};

export function PatternCard({ pattern, onCreateClick }: {
  pattern: PatternCardPattern;
  onCreateClick?: (p: PatternCardPattern) => void;
}) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);

  const signal = SIGNAL_CONFIG[pattern.signal_strength] ?? SIGNAL_CONFIG.emerging;
  const count = pattern.video_count ?? 0;

  const rawScore = pattern.confidence_score ?? null;
  const scoreDisplay = rawScore !== null
    ? (rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore))
    : null;

  const isVelocityHigh = (pattern.velocity_7d ?? 0) > 50;
  const metric2 = isVelocityHigh
    ? `+${Math.round(pattern.velocity_7d!)}%`
    : scoreDisplay !== null ? `${scoreDisplay}%` : '—';
  const metric2Label = isVelocityHigh ? 'Velocity' : 'Confidence';
  const metric2Color = isVelocityHigh ? '#f59e0b' : '#fff';

  const viewsLabel = pattern.predicted_views_min != null && pattern.predicted_views_max != null
    ? formatViews(pattern.predicted_views_min, pattern.predicted_views_max)
    : '—';

  const handleClick = () => {
    if (onCreateClick) onCreateClick(pattern);
    else navigate(`/create?patternId=${pattern.pattern_id}`);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '0 0 186px',
        background: '#0f1118',
        border: `1px solid ${hovered ? 'rgba(124,92,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Content */}
      <div style={{ padding: '11px 13px 9px', flex: 1 }}>
        {/* Signal badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 20,
          background: signal.bg, border: `1px solid ${signal.border}`,
          marginBottom: 8,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: signal.color, flexShrink: 0 }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: signal.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {signal.label}
          </span>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)', marginLeft: 1 }}>· {count}</span>
        </div>

        {/* Hook template */}
        <div style={{
          fontSize: 12, fontWeight: 600, color: '#fff',
          lineHeight: 1.45, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
        }}>
          {renderHookWithVars(pattern.hook_template || '')}
        </div>

        {/* Why it works */}
        {pattern.why_it_works && (
          <div style={{
            fontSize: 9.5, color: 'rgba(255,255,255,0.32)',
            borderLeft: '2px solid rgba(124,92,255,0.4)',
            paddingLeft: 7, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {pattern.why_it_works}
          </div>
        )}
      </div>

      {/* Metrics row */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '7px 13px', gap: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', marginBottom: 1 }}>{viewsLabel}</div>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Views</div>
        </div>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)', margin: '0 8px' }} />
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: metric2Color, marginBottom: 1 }}>{metric2}</div>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{metric2Label}</div>
        </div>
      </div>

      {/* CTA */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '7px 13px',
        background: hovered ? 'rgba(124,92,255,0.06)' : 'transparent',
        transition: 'background 0.15s',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: hovered ? '#a78bfa' : 'rgba(124,92,255,0.7)' }}>
          Create this video →
        </span>
      </div>
    </div>
  );
}
