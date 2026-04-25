import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { VideoCard, NICHE_LABELS } from "@/components/video-card-v3";

// ── Sidebar filter item ───────────────────────────────────────────────────────

function FilterItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '6px 10px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
        background: active ? 'rgba(124,92,255,0.12)' : 'transparent',
        marginBottom: 2, transition: 'all 0.12s',
      }}
    >
      {label}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
      letterSpacing: '0.1em', marginBottom: 8, marginTop: 4, fontWeight: 700,
    }}>
      {children}
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const NICHE_OPTIONS = [
  { key: 'all', label: 'All niches' },
  { key: 'finance', label: 'Finance' },
  { key: 'ai_tools', label: 'AI Tools' },
  { key: 'online_business', label: 'Online Business' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'content_creation', label: 'Content Creation' },
  { key: 'health_wellness', label: 'Health & Wellness' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'mindset', label: 'Mindset' },
  { key: 'digital_marketing', label: 'Digital Marketing' },
  { key: 'real_estate', label: 'Real Estate' },
];

const TREND_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'emerging', label: '🔥 Emerging' },
  { key: 'trending', label: '⚡ Trending' },
];

const SORT_OPTIONS = [
  { key: 'confidence', label: 'Confidence' },
  { key: 'velocity', label: 'Velocity' },
  { key: 'virality', label: 'Virality' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const [location, navigate] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');

  const [nicheFilter, setNicheFilter] = useState<string>(urlParams.get('niche') || 'all');
  const [trendFilter, setTrendFilter] = useState<string>(urlParams.get('filter') || 'all');
  const [sortBy, setSortBy] = useState<string>('confidence');
  const [visibleCount, setVisibleCount] = useState(48);

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

  const nicheBuckets = nicheFilter === 'all'
    ? mapped
    : mapped.filter(v => v.niche_cluster === nicheFilter || !v.niche_cluster);

  const sorted = [...nicheBuckets].sort((a, b) => {
    if (sortBy === 'confidence') return (b.confidence_score || 0) - (a.confidence_score || 0);
    if (sortBy === 'velocity') return (b._original.velocity7d || 0) - (a._original.velocity7d || 0);
    return (b.virality_score || 0) - (a.virality_score || 0);
  });

  const visible = sorted.slice(0, visibleCount);
  const nicheName = NICHE_OPTIONS.find(n => n.key === nicheFilter)?.label || 'All niches';
  const trendName = TREND_OPTIONS.find(t => t.key === trendFilter)?.label || 'All';

  return (
    <DashboardLayout>
      <div style={{ background: '#08080f', minHeight: '100vh', display: 'flex' }} data-testid="page-opportunities">

        {/* ── Sidebar filtres ── */}
        <div style={{
          width: 200, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 16px', minHeight: '100vh', position: 'sticky', top: 0,
        }}>
          {/* Back breadcrumb */}
          <div
            onClick={() => navigate('/home')}
            style={{ fontSize: 12, color: '#7C5CFF', cursor: 'pointer', marginBottom: 24, fontWeight: 600 }}
          >
            ← Intelligence
          </div>

          {/* Niche */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Niche</SectionLabel>
            {NICHE_OPTIONS.map(n => (
              <FilterItem
                key={n.key}
                label={n.label}
                active={nicheFilter === n.key}
                onClick={() => { setNicheFilter(n.key); setVisibleCount(48); }}
              />
            ))}
          </div>

          {/* Trend */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Trend</SectionLabel>
            {TREND_OPTIONS.map(t => (
              <FilterItem
                key={t.key}
                label={t.label}
                active={trendFilter === t.key}
                onClick={() => { setTrendFilter(t.key); setVisibleCount(48); }}
              />
            ))}
          </div>

          {/* Sort */}
          <div>
            <SectionLabel>Sort by</SectionLabel>
            {SORT_OPTIONS.map(s => (
              <FilterItem
                key={s.key}
                label={s.key === sortBy ? '✓ ' + s.label : s.label}
                active={sortBy === s.key}
                onClick={() => setSortBy(s.key)}
              />
            ))}
          </div>
        </div>

        {/* ── Content area ── */}
        <div style={{ flex: 1, padding: '20px 24px', minWidth: 0 }}>
          {/* Header dynamique */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7C5CFF', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 4 }}>
              {nicheFilter !== 'all' ? nicheName : 'All niches'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {trendFilter !== 'all' ? trendName + ' videos' : 'All videos'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
              {sorted.length} viral videos analyzed
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }} data-testid="opportunities-grid">
                {visible.map(v => (
                  <VideoCard key={v.id} video={v} niche={v.niche_cluster || 'finance'} />
                ))}
              </div>

              {visibleCount < sorted.length && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
                  <button
                    onClick={() => setVisibleCount(c => c + 48)}
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

      </div>
    </DashboardLayout>
  );
}
