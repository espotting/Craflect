import { useLocation } from "wouter";
import { NICHE_LABELS, NICHE_EMOJIS, NICHE_GRADIENTS, formatViews, renderHookWithVars } from "./video-card-v3";

function MetricItem({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

function DailySignalSkeleton() {
  return (
    <div style={{
      height: 380, background: 'linear-gradient(135deg,#080614 0%,#130826 45%,#091420 100%)',
      display: 'flex', alignItems: 'center', padding: '0 40px', gap: 24,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ height: 11, background: 'rgba(255,255,255,0.07)', borderRadius: 4, width: '20%', marginBottom: 18 }} />
        <div style={{ height: 38, background: 'rgba(255,255,255,0.07)', borderRadius: 6, width: '60%', marginBottom: 16 }} />
        <div style={{ height: 72, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 22 }} />
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {[60, 50, 55].map((w, i) => (
            <div key={i} style={{ height: 38, background: 'rgba(255,255,255,0.04)', borderRadius: 6, width: w }} />
          ))}
        </div>
        <div style={{ height: 44, background: 'rgba(124,92,255,0.12)', borderRadius: 10, width: 160 }} />
      </div>
      <div style={{ width: 138, height: 248, background: 'rgba(255,255,255,0.04)', borderRadius: 16, flexShrink: 0 }} />
    </div>
  );
}

export function DailySignalHero({ signal, niche }: { signal: any; niche: string }) {
  const [, navigate] = useLocation();
  const nicheLabel = NICHE_LABELS[niche] || niche;

  // undefined = still loading → skeleton
  if (signal === undefined) return <DailySignalSkeleton />;

  if (signal.used) return (
    <div style={{
      height: 100, background: 'linear-gradient(135deg,#080614,#130826)',
      display: 'flex', alignItems: 'center', padding: '0 40px', justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>
        {signal.message || "You're creating from today's signal. Come back tomorrow 🔥"}
      </div>
      <button
        onClick={() => navigate('/performance')}
        style={{
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
          color: '#10b981', padding: '10px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Track my video →
      </button>
    </div>
  );

  // null signal = no pattern available for this niche yet → compact empty state
  if (!signal.signal) return (
    <div style={{
      height: 100, background: 'linear-gradient(135deg,#080614,#130826)',
      display: 'flex', alignItems: 'center', padding: '0 40px', gap: 16,
    }}>
      <div style={{ fontSize: 24 }}>🔮</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>No signal today</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>New viral patterns are being analyzed — check back soon.</div>
      </div>
    </div>
  );

  const s = signal.signal;
  const gradient = NICHE_GRADIENTS[niche] || NICHE_GRADIENTS.default;

  const handleCreate = async () => {
    try { await fetch('/api/daily-signal/use', { method: 'POST', credentials: 'include' }); } catch {}
    navigate('/create?patternId=' + s.pattern_id);
  };

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', height: 380,
      background: 'linear-gradient(135deg,#080614 0%,#130826 45%,#091420 100%)',
    }}>
      {/* Glows décoratifs */}
      <div style={{
        position: 'absolute', top: -60, right: 140, width: 360, height: 360,
        background: 'radial-gradient(circle,rgba(124,92,255,0.12) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: 40, width: 280, height: 280,
        background: 'radial-gradient(circle,rgba(192,38,211,0.07) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', height: '100%', alignItems: 'center' }}>
        {/* Contenu gauche */}
        <div style={{ flex: 1, padding: '0 40px' }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#7C5CFF',
            textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6,
          }}>
            {nicheLabel}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18,
          }}>
            Signal du Jour
          </div>
          <div style={{
            fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 14,
            background: 'linear-gradient(90deg,#ffffff,rgba(255,255,255,0.75))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {s.pattern_label || "Today's Signal"}
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: 14, color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.65, marginBottom: 22,
            borderLeft: '2px solid rgba(124,92,255,0.45)', paddingLeft: 16, maxWidth: 520,
          }}>
            {renderHookWithVars(s.hook_template || '')}
          </div>

          {/* Métriques 3 colonnes */}
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 26 }}>
            <MetricItem
              value={s.predicted_views_min ? formatViews(s.predicted_views_min, s.predicted_views_max) : '—'}
              label="Vues attendues"
              color="#a78bfa"
            />
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', height: 36, margin: '0 24px' }} />
            <MetricItem
              value={Math.round(s.confidence_score || 0) + '%'}
              label="Confiance"
              color="#10b981"
            />
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', height: 36, margin: '0 24px' }} />
            <MetricItem
              value={String(s.video_count || 0)}
              label="Vidéos similaires"
              color="#fff"
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCreate}
              style={{
                background: 'linear-gradient(90deg,#7C5CFF,#c026d3)', border: 'none',
                color: '#fff', padding: '12px 26px', borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Créer cette vidéo →
            </button>
            <button
              onClick={() => navigate('/opportunities')}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
                color: 'rgba(255,255,255,0.45)', padding: '12px 18px', borderRadius: 10,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Explorer plus
            </button>
          </div>
        </div>

        {/* Thumbnail droite 9:16 */}
        <div style={{
          width: 210, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '24px 24px 24px 0',
        }}>
          <div style={{
            width: 138, height: 248, borderRadius: 16, overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.06)',
          }}>
            {s.thumbnail_url ? (
              <img src={s.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            ) : (
              <div style={{
                width: '100%', height: '100%', background: gradient,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: 14, textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{NICHE_EMOJIS[niche] || '🎯'}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5 }}>
                  {(s.hook_template || '').substring(0, 60)}
                </div>
              </div>
            )}
            <div style={{
              position: 'absolute', top: 10, left: 10, background: 'rgba(239,68,68,0.92)',
              color: '#fff', fontSize: 8, fontWeight: 800, padding: '3px 8px',
              borderRadius: 6, letterSpacing: '0.06em',
            }}>
              🔥 HOT
            </div>
            <div style={{
              position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.72)',
              color: '#a78bfa', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 7,
            }}>
              {Math.round(s.avg_virality_score || 0)}
            </div>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg,#7C5CFF,#c026d3)',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
