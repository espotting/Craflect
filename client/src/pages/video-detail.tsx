import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout";
import { PatternCard, type PatternCardPattern } from "@/components/pattern-card";

function toPatternCard(p: any): PatternCardPattern {
  const vel = typeof p.velocity_7d === 'number' ? p.velocity_7d : 0;
  return {
    patternId: p.pattern_id,
    hookTemplate: p.hook_template,
    whyItWorks: p.why_it_works,
    signalStrength: p.signal_strength ?? 'emerging',
    videoCount: p.video_count ?? null,
    predictedViewsMin: p.predicted_views_min ?? null,
    predictedViewsMax: p.predicted_views_max ?? null,
    velocity7d: vel,
    avgViralityScore: p.avg_virality_score ?? null,
    avgEngagementRate: p.avg_engagement_rate ?? null,
    topicCluster: p.topic_cluster ?? null,
    platform: p.platform ?? null,
  };
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)',
      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
      ...style,
    }}>
      {children}
    </div>
  );
}

function renderHookLarge(template: string | null): React.ReactNode {
  if (!template) return '"No hook available"';
  const parts = template.split(/(\[[^\]]+\])/g);
  return (
    <>
      &ldquo;
      {parts.map((part, i) =>
        /^\[.*\]$/.test(part) ? (
          <em key={i} style={{
            fontStyle: 'normal', color: '#a78bfa',
            background: 'rgba(124,92,255,0.15)',
            padding: '1px 5px', borderRadius: 4,
          }}>
            {part}
          </em>
        ) : part
      )}
      &rdquo;
    </>
  );
}

function fmtCount(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(Math.round(n));
}

function VideoDetailSkeleton() {
  return (
    <DashboardLayout>
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
        Loading pattern...
      </div>
    </DashboardLayout>
  );
}

export default function VideoDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const patternId = params.id;
  const [activePatternId, setActivePatternId] = useState(patternId);
  const [activeTab, setActiveTab] = useState<'hook' | 'dna' | 'similar' | 'transcript'>('hook');

  const { data: rawPattern, isLoading } = useQuery<any>({
    queryKey: ['/api/patterns', activePatternId],
    queryFn: () => fetch(`/api/patterns/${activePatternId}`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!activePatternId,
  });

  const { data: similarRaw = [] } = useQuery<any[]>({
    queryKey: ['/api/patterns', activePatternId, 'similar'],
    queryFn: () => fetch(`/api/patterns/${activePatternId}/similar`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!activePatternId,
  });

  const { data: sourceVideo } = useQuery<any>({
    queryKey: ['/api/patterns', activePatternId, 'source-video'],
    queryFn: () => fetch(`/api/patterns/${activePatternId}/source-video`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!activePatternId,
  });

  if (isLoading) return <VideoDetailSkeleton />;
  if (!rawPattern || rawPattern.error) return (
    <DashboardLayout>
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        Pattern not found.
      </div>
    </DashboardLayout>
  );

  const pattern = toPatternCard(rawPattern);
  const similarPatterns: PatternCardPattern[] = (similarRaw as any[]).map(toPatternCard);

  const breadcrumb = [
    rawPattern.topic_cluster?.replace(/_/g, ' '),
    rawPattern.hook_type_v2?.replace(/_/g, ' '),
  ].filter(Boolean).join(' · ');

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', background: '#08080f', minHeight: '100%' }}>

        {/* Back nav */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => navigate('/patterns')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: 'rgba(255,255,255,0.3)',
              padding: '4px 10px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent', cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
              <path d="M8 10L4 6l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Patterns
          </button>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>›</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, textTransform: 'capitalize' }}>
            {breadcrumb || 'Pattern detail'}
          </span>
        </div>

        {/* Two-column layout */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* Left column — 290px */}
          <div style={{
            width: 290, flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
            overflowY: 'auto',
          }}>

            {/* PatternCard full */}
            <div>
              <SectionLabel>Selected pattern</SectionLabel>
              <PatternCard pattern={{ ...pattern, size: 'full' }} />
            </div>

            {/* Source video */}
            {sourceVideo && (
              <div>
                <SectionLabel>Source video</SectionLabel>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.02)', marginBottom: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#7C5CFF,#c026d3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {(sourceVideo.creator_name?.[0] ?? 'C').toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>
                      @{sourceVideo.creator_name || 'creator'}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>
                      {sourceVideo.followers_count
                        ? fmtCount(sourceVideo.followers_count) + ' followers'
                        : rawPattern.topic_cluster?.replace(/_/g, ' ') || ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                  {[
                    { val: fmtCount(sourceVideo.views), label: 'Views', color: '#a78bfa' },
                    { val: sourceVideo.engagement_rate ? (sourceVideo.engagement_rate * 100).toFixed(1) + '%' : '—', label: 'Engagement', color: '#22c55e' },
                    { val: fmtCount(sourceVideo.likes), label: 'Likes', color: '#f472b6' },
                    { val: fmtCount(sourceVideo.shares), label: 'Shares', color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '9px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', marginBottom: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.22)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {sourceVideo.published_at && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginBottom: 4 }}>
                    {Math.floor((Date.now() - new Date(sourceVideo.published_at).getTime()) / 86400000)} days ago
                    {sourceVideo.duration_seconds ? ` · ${sourceVideo.duration_seconds}s` : ''}
                  </div>
                )}
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <button
                onClick={() => navigate('/create?patternId=' + activePatternId)}
                style={{
                  width: '100%', padding: 10, borderRadius: 9, border: 'none',
                  background: 'linear-gradient(90deg,#7C5CFF,#c026d3)',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
                data-testid="button-create-from-detail"
              >
                Create this video →
              </button>
              <button
                style={{
                  width: '100%', padding: 9, borderRadius: 9,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.45)', fontSize: 11, cursor: 'pointer',
                }}
                data-testid="button-save-playbook"
              >
                Save to Playbook
              </button>
            </div>
          </div>

          {/* Right column — intelligence */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

            {/* Tabs */}
            <div style={{
              display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '0 22px', flexShrink: 0,
            }}>
              {([
                { id: 'hook', label: 'Hook Intelligence' },
                { id: 'dna', label: 'Content DNA' },
                { id: 'similar', label: 'Similar Patterns' },
                { id: 'transcript', label: 'Transcript' },
              ] as const).map(tab => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '13px 16px',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    color: activeTab === tab.id ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                    borderBottom: activeTab === tab.id ? '2px solid #7C5CFF' : '2px solid transparent',
                    marginBottom: -1, whiteSpace: 'nowrap', transition: 'color 0.15s',
                  }}
                >
                  {tab.label}
                </div>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, padding: '20px 22px', overflowY: 'auto' }}>

              {/* Hook Intelligence */}
              {activeTab === 'hook' && (
                <div>
                  <SectionLabel>Hook breakdown</SectionLabel>
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: 'rgba(124,92,255,0.05)',
                    border: '1px solid rgba(124,92,255,0.14)',
                    marginBottom: 14,
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10 }}>
                      {renderHookLarge(rawPattern.hook_template)}
                    </div>
                    {rawPattern.why_it_works && (
                      <div style={{
                        fontSize: 11.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65,
                        borderLeft: '2px solid rgba(124,92,255,0.38)', paddingLeft: 12, marginBottom: 12,
                      }}>
                        {rawPattern.why_it_works}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[
                        { key: 'Hook type', val: [rawPattern.hook_type_v2, rawPattern.emotion_primary].filter(Boolean).map((v: string) => v.replace(/_/g, ' ')).join(' · ') || '—' },
                        { key: 'Template', val: rawPattern.hook_template || '—' },
                        { key: 'Hook window', val: 'First 3 seconds — direct statement' },
                        { key: 'Structure', val: rawPattern.structure_type?.replace(/_/g, ' ') || '—' },
                      ].map(t => (
                        <div key={t.key} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 11px', borderRadius: 7,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          <span style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: 76, whiteSpace: 'nowrap' }}>{t.key}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500, textTransform: 'capitalize' }}>{t.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <SectionLabel style={{ marginTop: 18 }}>Pattern signal</SectionLabel>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 9,
                    border: '1px solid rgba(34,197,94,0.2)',
                    background: 'rgba(34,197,94,0.04)', marginBottom: 14,
                  }}>
                    <div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 9px', borderRadius: 20,
                        background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                        fontSize: 9, fontWeight: 700, color: '#22c55e',
                        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
                      }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
                        {(pattern.signalStrength.charAt(0).toUpperCase() + pattern.signalStrength.slice(1))} signal
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                        {rawPattern.video_count} videos share this pattern
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                        {rawPattern.video_count ?? 0}
                      </div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        similar videos
                      </div>
                    </div>
                  </div>

                  <SectionLabel style={{ marginTop: 18 }}>Content structure</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      { n: 1, label: 'Hook — ' + (rawPattern.hook_type_v2?.replace(/_/g, ' ') || 'Direct statement'), time: '0–3s' },
                      { n: 2, label: 'Proof — Authority or social proof', time: '3–12s' },
                      { n: 3, label: 'Value — The real answer or insight', time: '12–35s' },
                      { n: 4, label: 'CTA — Follow, comment or share', time: '35s+' },
                    ].map(s => (
                      <div key={s.n} style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '9px 12px', borderRadius: 7,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'rgba(124,92,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: '#a78bfa', flexShrink: 0,
                        }}>{s.n}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', flex: 1, fontWeight: 500 }}>{s.label}</div>
                        <div style={{
                          fontSize: 9, padding: '2px 7px', borderRadius: 10,
                          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap',
                        }}>{s.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content DNA */}
              {activeTab === 'dna' && (
                <div>
                  <SectionLabel>Content DNA</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Hook mechanism', val: rawPattern.hook_type_v2?.replace(/_/g, ' ') || '—', pct: 87 },
                      { label: 'Emotion primary', val: rawPattern.emotion_primary?.replace(/_/g, ' ') || '—', pct: 75 },
                      { label: 'Structure type', val: rawPattern.structure_type?.replace(/_/g, ' ') || '—', pct: 65 },
                      { label: 'Platform', val: rawPattern.platform || 'tiktok', pct: 100 },
                      { label: 'Topic cluster', val: rawPattern.topic_cluster?.replace(/_/g, ' ') || '—', pct: 80 },
                      { label: 'Signal strength', val: pattern.signalStrength, pct: pattern.signalStrength === 'strong' ? 90 : pattern.signalStrength === 'building' ? 60 : 35 },
                    ].map(d => (
                      <div key={d.label} style={{
                        padding: '11px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{d.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize', marginBottom: 7 }}>{d.val}</div>
                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          <div style={{ width: `${d.pct}%`, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#7C5CFF,#a78bfa)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Patterns */}
              {activeTab === 'similar' && (
                <div>
                  <SectionLabel>
                    Similar patterns{' '}
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                      — click to update left panel
                    </span>
                  </SectionLabel>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* Active pattern card */}
                    <div style={{
                      width: 200, borderRadius: 9,
                      border: '1px solid rgba(124,92,255,0.5)',
                      background: '#131420', overflow: 'hidden',
                      opacity: 0.7,
                    }}>
                      <PatternCard pattern={{ ...pattern, size: 'full' }} />
                      <div style={{ padding: '6px 10px', background: 'rgba(124,92,255,0.12)', fontSize: 9, fontWeight: 600, color: '#a78bfa', textAlign: 'center' }}>
                        Currently shown ✓
                      </div>
                    </div>
                    {similarPatterns.map(sim => (
                      <div
                        key={sim.patternId}
                        style={{ width: 200, cursor: 'pointer' }}
                        onClick={() => {
                          setActivePatternId(sim.patternId);
                          setActiveTab('hook');
                        }}
                      >
                        <PatternCard pattern={{ ...sim, size: 'full' }} />
                      </div>
                    ))}
                    {similarPatterns.length === 0 && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', paddingTop: 8 }}>
                        No similar patterns found for this cluster.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transcript */}
              {activeTab === 'transcript' && (
                <div>
                  <SectionLabel>Transcript</SectionLabel>
                  {sourceVideo?.transcript ? (
                    <div style={{
                      padding: '14px 16px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      fontSize: 12, color: 'rgba(255,255,255,0.45)',
                      lineHeight: 1.7, fontStyle: 'italic',
                    }}>
                      {sourceVideo.transcript}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                      No transcript available for this pattern.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
