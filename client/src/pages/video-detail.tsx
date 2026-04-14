import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { DashboardLayout } from "@/components/layout";
import { VideoCard, NICHE_LABELS, NICHE_GRADIENTS, NICHE_EMOJIS, formatViews, renderHookWithVars } from "@/components/video-card-v3";

function PatternMiniCard({ pattern }: { pattern: any }) {
  const [, navigate] = useLocation();
  return (
    <div
      onClick={() => navigate('/create?patternId=' + pattern.pattern_id)}
      style={{
        flex: '0 0 200px', borderRadius: 11, overflow: 'hidden', cursor: 'pointer',
        border: '1px solid rgba(124,92,255,0.15)', background: 'rgba(124,92,255,0.04)',
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>
        {pattern.pattern_label || 'Pattern'}
      </div>
      {pattern.hook_template && (
        <div style={{
          fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.5, marginBottom: 8, borderLeft: '2px solid rgba(124,92,255,0.3)', paddingLeft: 8,
        }}>
          {pattern.hook_template.substring(0, 80)}
        </div>
      )}
      {pattern.predicted_views_min && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
          👁 {formatViews(pattern.predicted_views_min, pattern.predicted_views_max)}
        </div>
      )}
      <div style={{ fontSize: 10, color: '#7C5CFF', fontWeight: 600 }}>
        Use in Studio →
      </div>
    </div>
  );
}

function VideoDetailSkeleton() {
  return (
    <DashboardLayout>
      <div style={{ background: '#08080f', minHeight: '100vh', padding: '20px 28px' }}>
        <div style={{ display: 'flex', gap: 32, marginBottom: 40 }}>
          <div style={{ width: 220, height: 390, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 11, background: 'rgba(255,255,255,0.07)', borderRadius: 4, width: '20%', marginBottom: 16 }} />
            <div style={{ height: 32, background: 'rgba(255,255,255,0.07)', borderRadius: 6, width: '60%', marginBottom: 14 }} />
            <div style={{ height: 60, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 56, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function VideoDetail({ id: propId }: { id?: string }) {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/video/:id');
  const id = propId || params?.id;

  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/video', id],
    queryFn: () => fetch('/api/video/' + id, { credentials: 'include' }).then(r => r.json()),
    enabled: !!id,
  });

  if (isLoading || !id) return <VideoDetailSkeleton />;
  if (!data?.video) return (
    <DashboardLayout>
      <div style={{ background: '#08080f', minHeight: '100vh', padding: '40px 28px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        Vidéo non trouvée
      </div>
    </DashboardLayout>
  );

  const { video, similar, patterns } = data;
  const niche = video.niche_cluster || 'finance';
  const gradient = NICHE_GRADIENTS[niche] || NICHE_GRADIENTS.default;

  const stats = [
    {
      label: 'Vues attendues',
      value: video.predicted_views_min ? formatViews(video.predicted_views_min, video.predicted_views_max) : '500K+',
      color: '#a78bfa',
    },
    { label: 'Confiance', value: Math.round(video.confidence_score || 75) + '%', color: '#10b981' },
    { label: 'Durée optimale', value: (video.optimal_duration || 45) + 's', color: '#fff' },
    { label: 'Vélocité', value: '+' + Math.round(video.velocity_7d || 0), color: '#f59e0b' },
  ];

  const tags = [video.hook_type_v2, video.structure_type, 'TikTok · Reels', 'Face cam'].filter(Boolean);

  return (
    <DashboardLayout>
      <div style={{ background: '#08080f', minHeight: '100vh', padding: '20px 28px' }}>

        {/* Back */}
        <div
          onClick={() => navigate('/home')}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Retour au feed
        </div>

        {/* Hero */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 40, alignItems: 'flex-start' }}>

          {/* Thumbnail gauche 9:16 */}
          <div style={{ flexShrink: 0 }}>
            <div style={{
              width: 220, height: 390, borderRadius: 16, overflow: 'hidden', position: 'relative',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.06)',
            }}>
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              ) : (
                <div style={{
                  width: '100%', height: '100%', background: gradient,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: 20, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>{NICHE_EMOJIS[niche] || '🎯'}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5 }}>
                    {(video.hook_text || '').substring(0, 80)}
                  </div>
                </div>
              )}
              <div style={{
                position: 'absolute', top: 10, left: 10,
                background: video.trend_status === 'emerging' ? 'rgba(239,68,68,0.92)' : 'rgba(124,92,255,0.92)',
                color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
              }}>
                {video.trend_status === 'emerging' ? '🔥 EMERGING' : '⚡ TRENDING'}
              </div>
              <div style={{
                position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.72)',
                color: '#a78bfa', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 7,
              }}>
                {Math.round(video.virality_score || 0)}
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#7C5CFF,#c026d3)' }} />
            </div>

            {video.creator_name && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(124,92,255,0.15)', border: '1px solid rgba(124,92,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                }}>
                  👤
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>@{video.creator_name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                    {video.views ? Math.round(video.views / 1000) + 'K views' : ''} · TikTok
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Infos droite */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7C5CFF', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>
              {NICHE_LABELS[niche] || niche}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
              {video.pattern_label ? 'Pattern · ' + (video.hook_type_v2 || 'Hook') : 'Vidéo Virale'}
            </div>
            <div style={{
              fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 14,
              background: 'linear-gradient(90deg,#ffffff,rgba(255,255,255,0.75))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {video.pattern_label || video.hook_text?.substring(0, 60) || 'Vidéo Virale'}
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65,
              marginBottom: 20, borderLeft: '2px solid rgba(124,92,255,0.45)', paddingLeft: 16, maxWidth: 520,
            }}>
              {renderHookWithVars(video.hook_template || video.hook_text || '')}
            </div>

            {/* Stats 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18, maxWidth: 440 }}>
              {stats.map(s => (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {tags.map(tag => (
                <div key={tag} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.45)', padding: '4px 10px', borderRadius: 20, fontSize: 11,
                }}>
                  {tag}
                </div>
              ))}
            </div>

            {/* Why it works */}
            {video.why_it_works && (
              <div style={{
                background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)',
                borderRadius: 10, padding: '12px 14px', marginBottom: 20,
              }}>
                <div style={{ fontSize: 9, color: 'rgba(16,185,129,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Pourquoi ça marche
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  {video.why_it_works}
                </div>
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/create?patternId=' + (video.pattern_id || video.cluster_id || ''))}
                style={{
                  background: 'linear-gradient(90deg,#7C5CFF,#c026d3)', border: 'none',
                  color: '#fff', padding: '12px 26px', borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Créer cette vidéo →
              </button>
              <button style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.45)', padding: '12px 16px', borderRadius: 10,
                fontSize: 12, cursor: 'pointer',
              }}>
                Sauvegarder
              </button>
              <button
                onClick={() => navigate('/performance')}
                style={{
                  background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)',
                  color: '#10b981', padding: '12px 16px', borderRadius: 10,
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                Tracker
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

        {/* Vidéos similaires */}
        {Array.isArray(similar) && similar.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                Emerging Now
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: 4 }}>
                  {NICHE_LABELS[niche]}
                </span>
              </div>
              <span
                onClick={() => navigate('/opportunities?niche=' + niche)}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
              >
                Voir tout →
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' as any }}>
              {similar.map((v: any) => <VideoCard key={v.id} video={v} niche={niche} />)}
            </div>
          </div>
        )}

        {/* Patterns recommandés */}
        {Array.isArray(patterns) && patterns.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C5CFF' }} />
                Patterns recommandés
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: 4 }}>
                  {NICHE_LABELS[niche]}
                </span>
              </div>
              <span onClick={() => navigate('/create')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                Voir tout →
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' as any }}>
              {patterns.map((p: any) => <PatternMiniCard key={p.pattern_id} pattern={p} />)}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
