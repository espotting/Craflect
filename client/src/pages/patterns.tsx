import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout";
import { PatternCard } from "@/components/pattern-card";
import { usePlatform } from "@/hooks/use-platform";

const NICHES = [
  { id: 'all',               label: 'All niches' },
  { id: 'finance',           label: 'Finance' },
  { id: 'ai_tools',          label: 'AI Tools' },
  { id: 'online_business',   label: 'Online Business' },
  { id: 'content_creation',  label: 'Content Creation' },
  { id: 'productivity',      label: 'Productivity' },
  { id: 'health_wellness',   label: 'Health & Wellness' },
  { id: 'fitness',           label: 'Fitness' },
  { id: 'mindset',           label: 'Mindset' },
  { id: 'digital_marketing', label: 'Digital Marketing' },
  { id: 'real_estate',       label: 'Real Estate' },
  { id: 'crypto',            label: 'Crypto' },
  { id: 'parenting',         label: 'Parenting' },
  { id: 'relationships',     label: 'Relationships' },
  { id: 'cooking_food',      label: 'Cooking & Food' },
  { id: 'travel',            label: 'Travel' },
  { id: 'fashion_style',     label: 'Fashion & Style' },
  { id: 'personal_finance',  label: 'Personal Finance' },
  { id: 'side_hustle',       label: 'Side Hustle' },
  { id: 'self_improvement',  label: 'Self-Improvement' },
  { id: 'education',         label: 'Education' },
];

export default function Patterns() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { platform } = usePlatform();

  const urlNiche = new URLSearchParams(search).get('niche') || 'all';

  const [activeTab, setActiveTab] = useState<'trending' | 'rising'>('trending');
  const [selectedNiche, setSelectedNiche] = useState(urlNiche);
  const [selectedSignal, setSelectedSignal] = useState<string>('all');

  useEffect(() => {
    if (urlNiche && urlNiche !== 'all') setSelectedNiche(urlNiche);
  }, [urlNiche]);

  // Reset signal filter when switching tabs
  useEffect(() => {
    setSelectedSignal('all');
  }, [activeTab]);

  const queryParams = new URLSearchParams({
    tab: activeTab,
    platform,
    ...(selectedNiche !== 'all' && { niche: selectedNiche }),
    ...(selectedSignal !== 'all' && { signal: selectedSignal }),
    limit: '24',
  }).toString();

  const { data: patternsRaw = [], isLoading } = useQuery({
    queryKey: ['/api/patterns/list', activeTab, selectedNiche, selectedSignal, platform],
    queryFn: () =>
      fetch(`/api/patterns/list?${queryParams}`, { credentials: 'include' }).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const patterns: any[] = Array.isArray(patternsRaw) ? patternsRaw : [];

  return (
    <DashboardLayout>
      <div style={{ minHeight: '100%' }} data-testid="page-patterns">

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Patterns
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            {patterns.length} patterns detected · {platform} · updated every 6h
          </div>
        </div>

        {/* ── Tabs Trending / Rising ── */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 20,
        }}>
          {(['trending', 'rising'] as const).map(tab => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                color: activeTab === tab ? '#a78bfa' : 'rgba(255,255,255,0.35)',
                borderBottom: activeTab === tab ? '2px solid #7C5CFF' : '2px solid transparent',
                marginBottom: -1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {tab === 'trending' ? '⚡ Trending' : '🚀 Rising'}
              {tab === 'rising' && (
                <span style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444', fontWeight: 700,
                }}>NEW</span>
              )}
            </div>
          ))}
        </div>

        {/* ── Filtres ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 20 }}>

          {/* Niche select */}
          <select
            value={selectedNiche}
            onChange={e => setSelectedNiche(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: selectedNiche !== 'all' ? '#a78bfa' : 'rgba(255,255,255,0.6)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              outline: 'none',
            }}
          >
            {NICHES.map(n => (
              <option key={n.id} value={n.id} style={{ background: '#0f1118' }}>
                {n.label}
              </option>
            ))}
          </select>

          {/* Signal filter — trending tab only */}
          {activeTab === 'trending' && (
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { id: 'all',      label: 'All signals', color: undefined },
                { id: 'strong',   label: '● Strong',    color: '#22c55e' },
                { id: 'building', label: '● Building',  color: '#f59e0b' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSignal(s.id)}
                  style={{
                    padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                    background: selectedSignal === s.id
                      ? 'rgba(124,92,255,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    border: selectedSignal === s.id
                      ? '1px solid rgba(124,92,255,0.3)'
                      : '1px solid rgba(255,255,255,0.08)',
                    color: selectedSignal === s.id
                      ? (s.color || '#a78bfa')
                      : 'rgba(255,255,255,0.5)',
                    fontSize: 12, fontWeight: 500,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Grid ── */}
        {isLoading ? (
          <PatternGridSkeleton />
        ) : patterns.length === 0 ? (
          <EmptyState tab={activeTab} niche={selectedNiche} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10,
          }}>
            {patterns.map((pattern: any) => (
              <PatternCard
                key={pattern.pattern_id}
                pattern={{
                  patternId: pattern.pattern_id,
                  hookTemplate: pattern.hook_template,
                  whyItWorks: pattern.why_it_works,
                  signalStrength: pattern.signal_strength || 'emerging',
                  videoCount: pattern.video_count ?? null,
                  predictedViewsMin: pattern.predicted_views_min ?? null,
                  predictedViewsMax: pattern.predicted_views_max ?? null,
                  avgViralityScore: pattern.avg_virality_score ?? null,
                  avgEngagementRate: pattern.avg_engagement_rate ?? null,
                  velocity7d: pattern.velocity_7d ?? null,
                  topicCluster: pattern.topic_cluster ?? null,
                  platform: pattern.platform ?? null,
                }}
              />
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

function PatternGridSkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 10,
    }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          borderRadius: 11, border: '1px solid rgba(255,255,255,0.05)',
          background: '#0f1118', overflow: 'hidden', height: 260,
          display: 'flex', flexDirection: 'column', gap: 8, padding: 12,
        }}>
          {[80, 100, 60, 90, 50, 70].map((w, j) => (
            <div key={j} style={{
              height: j < 2 ? 14 : 3,
              width: `${w}%`,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.05)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab, niche }: { tab: string; niche: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>
        {tab === 'rising' ? '🚀' : '📊'}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
        {tab === 'rising'
          ? 'No emerging patterns yet'
          : `No trending patterns for ${niche === 'all' ? 'all niches' : niche.replace(/_/g, ' ')}`}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', maxWidth: 320 }}>
        {tab === 'rising'
          ? 'The Pattern Engine is monitoring for new signals. Check back in a few hours.'
          : 'Try selecting a different niche or signal strength.'}
      </div>
    </div>
  );
}
