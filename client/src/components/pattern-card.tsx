import React from "react";
import { useLocation } from "wouter";

export interface PatternCardPattern {
  patternId: string;
  hookTemplate: string | null;
  whyItWorks: string | null;
  signalStrength: 'strong' | 'building' | 'emerging';
  videoCount: number | null;
  predictedViewsMin: number | null;
  predictedViewsMax: number | null;
  velocity7d: number | null;
  avgViralityScore: number | null;
  avgEngagementRate: number | null;
  topicCluster: string | null;
  platform: string | null;
  size?: 'feed' | 'full';
}

const COLORS = {
  bg: '#0f1118',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(124,92,255,0.35)',
  text: '#fff',
  muted: 'rgba(255,255,255,0.32)',
  dim: 'rgba(255,255,255,0.18)',
  violet: '#7C5CFF',
  violetLight: '#a78bfa',
  green: '#22c55e',
  amber: '#f59e0b',
};

const SIGNAL_CONFIG = {
  strong: {
    label: 'Strong',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.25)',
    glow: '0 0 8px rgba(34,197,94,0.35)',
  },
  building: {
    label: 'Building',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.25)',
    glow: '0 0 8px rgba(245,158,11,0.35)',
  },
  emerging: {
    label: 'Emerging',
    color: '#a78bfa',
    bg: 'rgba(124,92,255,0.10)',
    border: 'rgba(124,92,255,0.20)',
    glow: '0 0 8px rgba(124,92,255,0.35)',
  },
};

function formatViews(min: number | null, max: number | null): string {
  if (min == null && max == null) return '—';
  const val = max ?? min ?? 0;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
  return String(Math.round(val));
}

function formatEngagement(rate: number | null): string {
  if (rate == null) return '—';
  const pct = rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(1)}%`;
}

function renderHook(template: string | null): React.ReactNode {
  if (!template) return <em style={{ color: COLORS.muted }}>No hook</em>;
  const quoted = `"${template}"`;
  const parts = quoted.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    /^\[/.test(part)
      ? <span key={i} style={{ color: COLORS.violetLight, fontStyle: 'italic' }}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

function MetricBar({
  label,
  value,
  display,
  barColor,
  pct,
}: {
  label: string;
  value: string;
  display: string;
  barColor: string | string[];
  pct: number;
}) {
  const bg = Array.isArray(barColor)
    ? `linear-gradient(90deg, ${barColor[0]}, ${barColor[1]})`
    : barColor;
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: COLORS.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: value }}>{display}</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.max(2, Math.min(100, pct))}%`,
          background: bg,
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

export function PatternCard({
  pattern,
  onCreateClick,
}: {
  pattern: PatternCardPattern;
  onCreateClick?: (p: PatternCardPattern) => void;
}) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = React.useState(false);

  const signal = SIGNAL_CONFIG[pattern.signalStrength] ?? SIGNAL_CONFIG.emerging;
  const count = pattern.videoCount ?? 0;

  const viewsPct = (() => {
    const max = pattern.predictedViewsMax ?? pattern.predictedViewsMin ?? 0;
    return Math.min(100, (max / 5_000_000) * 100);
  })();

  const engagementRaw = pattern.avgEngagementRate ?? 0;
  const engagementPct = Math.min(100, (engagementRaw <= 1 ? engagementRaw * 100 : engagementRaw) * 10);

  const velocityRaw = pattern.velocity7d ?? 0;
  const velocityPct = Math.min(100, Math.max(0, velocityRaw));

  const viralityRaw = pattern.avgViralityScore ?? 0;
  const viralityPct = Math.min(100, Math.max(0, viralityRaw));

  const handleCardClick = () => navigate(`/create?patternId=${pattern.patternId}`);
  const handleCTAClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreateClick) onCreateClick(pattern);
    else navigate(`/create?patternId=${pattern.patternId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '0 0 196px',
        background: COLORS.bg,
        border: `1px solid ${hovered ? COLORS.borderHover : COLORS.border}`,
        borderRadius: 12,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 6px 24px rgba(0,0,0,0.4)' : 'none',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Body */}
      <div style={{ padding: '11px 13px 10px', flex: 1 }}>
        {/* Signal badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 20,
          background: signal.bg, border: `1px solid ${signal.border}`,
          boxShadow: hovered ? signal.glow : 'none',
          marginBottom: 9,
          transition: 'box-shadow 0.15s',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: signal.color, flexShrink: 0 }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: signal.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {signal.label}
          </span>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)', marginLeft: 1 }}>· {count}</span>
        </div>

        {/* Hook */}
        <div style={{
          fontSize: 12, fontWeight: 600, color: COLORS.text,
          lineHeight: 1.45, marginBottom: 9,
          display: '-webkit-box', WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
        }}>
          {renderHook(pattern.hookTemplate)}
        </div>

        {/* Why it works */}
        {pattern.whyItWorks && (
          <div style={{
            fontSize: 9.5, color: COLORS.muted,
            borderLeft: '2px solid rgba(124,92,255,0.35)',
            paddingLeft: 7, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
            marginBottom: 10,
          }}>
            {pattern.whyItWorks}
          </div>
        )}

        {/* 4 metric bars */}
        <div style={{ marginTop: 4 }}>
          <MetricBar
            label="Views"
            value={COLORS.violetLight}
            display={formatViews(pattern.predictedViewsMin, pattern.predictedViewsMax)}
            barColor={COLORS.violet}
            pct={viewsPct}
          />
          <MetricBar
            label="Engagement"
            value={COLORS.green}
            display={formatEngagement(pattern.avgEngagementRate)}
            barColor={COLORS.green}
            pct={engagementPct}
          />
          <MetricBar
            label="Velocity 7d"
            value={velocityRaw > 0 ? COLORS.amber : COLORS.dim}
            display={velocityRaw !== 0 ? `${velocityRaw > 0 ? '+' : ''}${Math.round(velocityRaw)}%` : '—'}
            barColor={COLORS.amber}
            pct={velocityPct}
          />
          <MetricBar
            label="Virality"
            value={COLORS.violetLight}
            display={viralityRaw > 0 ? `${Math.round(viralityRaw)}` : '—'}
            barColor={[COLORS.violet, '#c026d3']}
            pct={viralityPct}
          />
        </div>
      </div>

      {/* CTA */}
      <div
        onClick={handleCTAClick}
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '7px 13px',
          background: hovered ? 'rgba(124,92,255,0.07)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: hovered ? COLORS.violetLight : 'rgba(124,92,255,0.65)' }}>
          Use this pattern →
        </span>
      </div>

      {/* Gradient signature bar */}
      <div style={{
        height: 2,
        background: 'linear-gradient(90deg, #7C5CFF, #c026d3)',
        opacity: hovered ? 1 : 0.4,
        transition: 'opacity 0.15s',
      }} />
    </div>
  );
}
