import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { VideoCard, NICHE_LABELS } from "@/components/video-card-v3";

// ── Chip button ───────────────────────────────────────────────────────────────

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
        background: active ? 'rgba(124,92,255,0.2)' : 'rgba(255,255,255,0.04)',
        border: '1px solid ' + (active ? 'rgba(124,92,255,0.5)' : 'rgba(255,255,255,0.08)'),
        color: active ? '#a78bfa' : 'rgba(255,255,255,0.4)',
      }}
    >
      {label}
    </button>
  );
}

// ── Filter row ────────────────────────────────────────────────────────────────

function FilterRow({ label, chips, active, onSelect }: {
  label: string; chips: { key: string; label: string }[];
  active: string; onSelect: (k: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', minWidth: 52 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' as any }}>
        {chips.map(c => (
          <Chip key={c.key} label={c.label} active={active === c.key} onClick={() => onSelect(c.key)} />
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TREND_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'emerging', label: '🔥 Emerging' },
  { key: 'trending', label: '⚡ Trending' },
];
const SORT_CHIPS = [
  { key: 'confidence', label: 'By confidence' },
  { key: 'velocity', label: 'By velocity' },
  { key: 'virality', label: 'By virality' },
];
const ALL_NICHES = [
  'finance', 'ai_tools', 'online_business', 'productivity', 'content_creation',
  'health_wellness', 'fitness', 'mindset', 'digital_marketing', 'real_estate',
];

export default function OpportunitiesPage() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');

  const [nicheFilter, setNicheFilter] = useState<string>(urlParams.get('niche') || 'all');
  const [trendFilter, setTrendFilter] = useState<string>(urlParams.get('filter') || 'all');
  const [sortBy, setSortBy] = useState<string>('confidence');
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    const n = urlParams.get('niche');
    const f = urlParams.get('filter');
    if (n) setNicheFilter(n);
    if (f) setTrendFilter(f);
  }, [location]);

  const apiParams = new URLSearchParams();
  if (trendFilter !== 'all') apiParams.set('velocity', trendFilter);
  const queryUrl = '/api/opportunities/top' + (apiParams.toString() ? '?' + apiParams.toString() : '');

  const { data: raw, isLoading } = useQuery({
    queryKey: ['/api/opportunities/top', trendFilter],
    queryFn: () => fetch(queryUrl, { credentials: 'include' }).then(r => r.json()),
  });

  const opportunities: any[] = Array.isArray(raw) ? raw : [];

  // Map opportunity → VideoCard format
  const mapped = opportunities.map(o => ({
    id: o.id,
    hook_text: o.hook,
    hook_type_v2: o.format,
    niche_cluster: o.nicheCluster || o.topic,
    virality_score: o.viralityScore,
    thumbnail_url: o.thumbnailUrl || null,
    trend_status: o.trendStatus || (trendFilter !== 'all' ? trendFilter : 'trending'),
    predicted_views_min: o.confidence ? o.viralityScore * 10000 : null,
    predicted_views_max: o.confidence ? o.viralityScore * 50000 : null,
    confidence_score: o.confidence || null,
    _original: o,
  }));

  // Apply niche filter
  const nicheBuckets = nicheFilter === 'all'
    ? mapped
    : mapped.filter(v => v.niche_cluster === nicheFilter || !v.niche_cluster);

  // Sort
  const sorted = [...nicheBuckets].sort((a, b) => {
    if (sortBy === 'confidence') return (b.confidence_score || 0) - (a.confidence_score || 0);
    if (sortBy === 'velocity') return (b._original.velocity7d || 0) - (a._original.velocity7d || 0);
    return (b.virality_score || 0) - (a.virality_score || 0);
  });

  const visible = sorted.slice(0, visibleCount);

  const nicheChips = [
    { key: 'all', label: 'All' },
    ...ALL_NICHES.map(n => ({ key: n, label: NICHE_LABELS[n] || n })),
  ];

  return (
    <DashboardLayout>
      <div style={{ background: '#08080f', minHeight: '100vh', padding: '20px 28px' }} data-testid="page-opportunities">

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#7C5CFF', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>
            Library
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Opportunities
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            {sorted.length} viral videos analyzed
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {/* Niche chips scrollables */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', minWidth: 52 }}>
              Niche
            </span>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' as any }}>
              {nicheChips.map(c => (
                <Chip key={c.key} label={c.label} active={nicheFilter === c.key} onClick={() => { setNicheFilter(c.key); setVisibleCount(24); }} />
              ))}
            </div>
          </div>
          <FilterRow label="Trend" chips={TREND_CHIPS} active={trendFilter} onSelect={v => { setTrendFilter(v); setVisibleCount(24); }} />
          <FilterRow label="Sort" chips={SORT_CHIPS} active={sortBy} onSelect={setSortBy} />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ flex: '0 0 150px', height: 240, background: 'rgba(255,255,255,0.04)', borderRadius: 11 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
            No opportunities found for this filter.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }} data-testid="opportunities-grid">
              {visible.map(v => (
                <VideoCard key={v.id} video={v} niche={v.niche_cluster || 'finance'} />
              ))}
            </div>

            {visibleCount < sorted.length && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                <button
                  onClick={() => setVisibleCount(c => c + 24)}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)', padding: '10px 32px', borderRadius: 10,
                    fontSize: 13, cursor: 'pointer',
                  }}
                  data-testid="button-load-more"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
