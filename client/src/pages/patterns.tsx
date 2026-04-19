import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout";
import { PatternConfidenceBadge } from "@/components/pattern-confidence-badge";
import { usePlaybook } from "@/hooks/use-playbook";

interface Pattern {
  id: string;
  pattern_id: string;
  pattern_label: string | null;
  hook_template: string | null;
  structure_template: string | null;
  optimal_duration: number | null;
  why_it_works: string | null;
  best_for: string | null;
  cta_suggestion: string | null;
  avg_virality_score: number | null;
  topic_cluster: string | null;
  video_count: number | null;
  predicted_views_min: number | null;
  predicted_views_max: number | null;
  confidence_score: number | null;
  sub_niche: string | null;
  hook_type_v2: string | null;
  decay_weight: number | null;
  velocity_7d: number | null;
  trend_status: string | null;
  signal_strength: 'strong' | 'building' | 'emerging';
  cluster_key: string | null;
  cluster_level: 2 | 3 | null;
  platform: string | null;
}

type Tab = 'trending' | 'rising' | 'stable' | 'fading';

const TABS: { key: Tab; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'rising',   label: 'Rising' },
  { key: 'stable',   label: 'Stable' },
  { key: 'fading',   label: 'Fading' },
];

function getTab(p: Pattern): Tab {
  const ts = (p.trend_status || '').toLowerCase();
  if (ts === 'fading' || (p.velocity_7d !== null && p.velocity_7d < 0)) return 'fading';
  if (ts === 'stable') return 'stable';
  if (p.signal_strength === 'strong' || ts === 'trending') return 'trending';
  if (p.signal_strength === 'building' || ts === 'rising') return 'rising';
  return 'stable';
}

function formatViews(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function Patterns() {
  const [tab, setTab] = useState<Tab>('trending');
  const [, navigate] = useLocation();
  const { complete } = usePlaybook();

  useEffect(() => {
    complete('patterns');
  }, []);

  const { data, isLoading } = useQuery<Pattern[]>({
    queryKey: ['/api/patterns/list'],
    queryFn: () => fetch('/api/patterns/list', { credentials: 'include' }).then(r => r.json()),
    staleTime: 30 * 60 * 1000,
  });

  const patterns = Array.isArray(data) ? data : [];

  const byTab: Record<Tab, Pattern[]> = {
    trending: patterns.filter(p => getTab(p) === 'trending'),
    rising:   patterns.filter(p => getTab(p) === 'rising'),
    stable:   patterns.filter(p => getTab(p) === 'stable'),
    fading:   patterns.filter(p => getTab(p) === 'fading'),
  };

  // If a tab would be empty, show all patterns there so the UI is never a dead end
  const visible = byTab[tab].length > 0 ? byTab[tab] : patterns;

  return (
    <DashboardLayout>
      <div style={{ background: '#08080f', minHeight: '100vh', padding: '28px 24px' }} data-testid="page-patterns">

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#7C5CFF', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>
            Pattern Feed
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            What's working right now
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
          {TABS.map(t => {
            const count = byTab[t.key].length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 14px', fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                  borderBottom: active ? '2px solid #7C5CFF' : '2px solid transparent',
                  marginBottom: -1, transition: 'color 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {t.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: active ? '#7C5CFF' : 'rgba(255,255,255,0.08)',
                    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                    borderRadius: 10, padding: '1px 6px',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 12,
                height: 100, border: '1px solid rgba(255,255,255,0.06)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            No patterns yet — check back soon.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.map((p, i) => (
              <div
                key={p.pattern_id || i}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '16px 18px',
                  transition: 'border-color 0.15s',
                }}
                data-testid={`card-pattern-${i}`}
              >
                {/* Badge */}
                <div style={{ marginBottom: 10 }}>
                  <PatternConfidenceBadge
                    signal_strength={p.signal_strength}
                    video_count={p.video_count ?? 0}
                    topic_cluster={p.topic_cluster}
                    sub_niche={p.sub_niche}
                    cluster_level={p.cluster_level}
                    platform={p.platform}
                    size="sm"
                  />
                </div>

                {/* Label */}
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
                  {p.pattern_label || '—'}
                </div>

                {/* Hook */}
                {p.hook_template && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.5 }}>
                    {p.hook_template}
                  </div>
                )}

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                  {p.predicted_views_min != null && p.predicted_views_max != null && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                        {formatViews(p.predicted_views_min)}–{formatViews(p.predicted_views_max)}
                      </span>
                      {' '}predicted views
                    </div>
                  )}
                  {p.avg_virality_score != null && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      Virality{' '}
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                        {p.avg_virality_score.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate(`/create?patternId=${p.pattern_id}`)}
                  style={{
                    background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.3)',
                    borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700,
                    color: '#a78bfa', cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  Use this pattern →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
