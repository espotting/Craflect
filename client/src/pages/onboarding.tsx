import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { DailySignalHero } from "@/components/daily-signal-hero";

// ── Data ─────────────────────────────────────────────────────────────────────

const NICHES = [
  { id: 'finance',           label: 'Finance',           emoji: '💰' },
  { id: 'ai_tools',          label: 'AI Tools',          emoji: '🤖' },
  { id: 'online_business',   label: 'Online Business',   emoji: '📈' },
  { id: 'content_creation',  label: 'Content Creation',  emoji: '🎬' },
  { id: 'productivity',      label: 'Productivity',      emoji: '✅' },
  { id: 'health_wellness',   label: 'Health & Wellness', emoji: '🌿' },
  { id: 'fitness',           label: 'Fitness',           emoji: '💪' },
  { id: 'mindset',           label: 'Mindset',           emoji: '🧠' },
  { id: 'digital_marketing', label: 'Digital Marketing', emoji: '📱' },
  { id: 'real_estate',       label: 'Real Estate',       emoji: '🏠' },
];

const PLATFORMS = [
  {
    id: 'tiktok',
    label: 'TikTok',
    emoji: '🎵',
    desc: 'Strong signal — 6,000+ videos analyzed',
    badge: 'Most data',
    badgeColor: '#22c55e',
  },
  {
    id: 'reels',
    label: 'Instagram Reels',
    emoji: '📸',
    desc: 'Growing signal — patterns being built',
    badge: 'Coming soon',
    badgeColor: '#f59e0b',
  },
  {
    id: 'shorts',
    label: 'YouTube Shorts',
    emoji: '▶️',
    desc: 'Growing signal — patterns being built',
    badge: 'Coming soon',
    badgeColor: '#f59e0b',
  },
];

const PLAYBOOK_ITEMS = [
  { label: "Check today's signal",  done: true  },
  { label: 'Pick a pattern',        done: true  },
  { label: 'Create your video',     done: false },
  { label: 'Track performance',     done: false },
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ── State ─────────────────────────────────────────────────────────────────────

interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  primaryNiche: string | null;
  selectedPlatforms: string[];
  activePlatform: string;
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          width: i === step ? 20 : 7, height: 7, borderRadius: 4,
          background: i < step ? '#22c55e' : i === step ? '#7C5CFF' : 'rgba(255,255,255,0.15)',
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    primaryNiche: null,
    selectedPlatforms: ['tiktok'],
    activePlatform: 'tiktok',
  });
  const [saving, setSaving] = useState(false);

  const setStep = (step: 1 | 2 | 3 | 4) => setState(s => ({ ...s, step }));

  // ── Screen 3 signal fetch ──
  const { data: signalData } = useQuery<any>({
    queryKey: ['/api/daily-signal', state.primaryNiche, state.activePlatform],
    queryFn: () => fetch(
      `/api/daily-signal?niche=${encodeURIComponent(state.primaryNiche || 'finance')}&platform=${state.activePlatform}`,
      { credentials: 'include' }
    ).then(r => r.json()),
    enabled: state.step >= 3 && !!state.primaryNiche,
    staleTime: 10 * 60 * 1000,
  });

  const handleStart = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await apiRequest('POST', '/api/onboarding/complete', {
        primaryNiche: state.primaryNiche,
        platforms: state.selectedPlatforms,
        activePlatform: state.activePlatform,
      });
    } catch {
      // Fallback: try PATCH preferences
      try {
        await apiRequest('PATCH', '/api/user/preferences', {
          primaryNiche: state.primaryNiche,
          selectedNiches: [state.primaryNiche],
          platforms: state.selectedPlatforms,
          active_platform: state.activePlatform,
          onboardingCompleted: true,
        });
      } catch {}
    }
    navigate('/home');
  };

  const container: React.CSSProperties = {
    minHeight: '100vh',
    background: '#08080f',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    fontFamily: 'system-ui, sans-serif',
    position: 'relative',
  };

  const card: React.CSSProperties = {
    width: '100%',
    maxWidth: 460,
  };

  const title: React.CSSProperties = {
    fontSize: 28, fontWeight: 800, color: '#fff',
    letterSpacing: '-0.02em', marginBottom: 8, margin: '0 0 8px',
  };

  const subtitle: React.CSSProperties = {
    fontSize: 14, color: 'rgba(255,255,255,0.4)',
    lineHeight: 1.6, marginBottom: 28, margin: '0 0 28px',
  };

  const btn: React.CSSProperties = {
    width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
    background: 'linear-gradient(90deg,#7C5CFF,#c026d3)',
    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  };

  const btnDisabled: React.CSSProperties = {
    ...btn, opacity: 0.4, cursor: 'not-allowed',
    background: 'rgba(255,255,255,0.08)',
  };

  // ── Glow blob ──
  return (
    <div style={container}>
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 400, background: 'rgba(124,92,255,0.07)',
        borderRadius: '50%', filter: 'blur(160px)', pointerEvents: 'none',
      }} />

      <div style={card}>
        <ProgressDots step={state.step} />

        {/* ── STEP 1 — Niche ── */}
        {state.step === 1 && (
          <div>
            <h2 style={title}>What's your niche?</h2>
            <p style={subtitle}>We'll personalize your signals based on your content focus.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              {NICHES.map(n => {
                const selected = state.primaryNiche === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setState(s => ({ ...s, primaryNiche: n.id }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '11px 14px', borderRadius: 9, cursor: 'pointer',
                      background: selected ? 'rgba(124,92,255,0.12)' : 'rgba(255,255,255,0.04)',
                      border: selected ? '1px solid rgba(124,92,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: selected ? '#a78bfa' : 'rgba(255,255,255,0.65)',
                      transition: 'all 0.15s', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{n.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: selected ? 600 : 400 }}>{n.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => state.primaryNiche && setStep(2)}
              style={state.primaryNiche ? btn : btnDisabled}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2 — Platforms ── */}
        {state.step === 2 && (
          <div>
            <h2 style={title}>Where do you create?</h2>
            <p style={subtitle}>Select the platforms you post on. TikTok has the most data.</p>

            <div style={{ marginBottom: 24 }}>
              {PLATFORMS.map(p => {
                const selected = state.selectedPlatforms.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setState(s => {
                        const next = selected
                          ? s.selectedPlatforms.length > 1
                            ? s.selectedPlatforms.filter(x => x !== p.id)
                            : s.selectedPlatforms
                          : [...s.selectedPlatforms, p.id];
                        return {
                          ...s,
                          selectedPlatforms: next,
                          activePlatform: next[0] || 'tiktok',
                        };
                      });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 10,
                      border: selected ? '1px solid rgba(124,92,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      background: selected ? 'rgba(124,92,255,0.08)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer', marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 24, flexShrink: 0 }}>{p.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{p.label}</span>
                        <span style={{
                          fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700,
                          background: `${p.badgeColor}20`,
                          border: `1px solid ${p.badgeColor}50`,
                          color: p.badgeColor,
                        }}>{p.badge}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{p.desc}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: selected ? '#7C5CFF' : 'transparent',
                      border: selected ? '1px solid #7C5CFF' : '1px solid rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '12px 20px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.4)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button onClick={() => setStep(3)} style={{ ...btn, flex: 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Signal preview ── */}
        {state.step === 3 && (
          <div>
            <h2 style={title}>Your first signal</h2>
            <p style={subtitle}>
              This is the kind of intelligence you'll get every day for{' '}
              <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                {NICHES.find(n => n.id === state.primaryNiche)?.label || state.primaryNiche}
              </span>.
            </p>

            {signalData?.signal ? (
              <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden' }}>
                <DailySignalHero signal={signalData} niche={state.primaryNiche || 'finance'} />
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '40px 20px', marginBottom: 20,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔮</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                  Signal incoming
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  We're analyzing{' '}
                  {NICHES.find(n => n.id === state.primaryNiche)?.label || state.primaryNiche?.replace(/_/g, ' ')}{' '}
                  content right now. Your first signal will be ready within 24 hours.
                </div>
              </div>
            )}

            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.22)',
              textAlign: 'center', marginBottom: 20,
            }}>
              This is your daily signal. It refreshes every 72 hours.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: '12px 20px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.4)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button onClick={() => setStep(4)} style={{ ...btn, flex: 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Playbook ready ── */}
        {state.step === 4 && (
          <div>
            <h2 style={title}>Your daily playbook is ready</h2>
            <p style={subtitle}>2 tasks already done. Complete the rest to build your streak.</p>

            {/* Playbook items */}
            <div style={{ marginBottom: 22 }}>
              {PLAYBOOK_ITEMS.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', borderRadius: 8, marginBottom: 6,
                  background: item.done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                  border: item.done ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: item.done ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    border: item.done ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 500,
                    color: item.done ? '#22c55e' : 'rgba(255,255,255,0.55)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>
                    {item.label}
                  </span>
                  {item.done && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                      color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>done</span>
                  )}
                </div>
              ))}
            </div>

            {/* 7-day streak visual */}
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.15)',
              marginBottom: 22,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                {DAYS.map((d, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: 9, color: 'rgba(255,255,255,0.25)',
                      marginBottom: 5, textTransform: 'uppercase',
                    }}>{d}</div>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: i === new Date().getDay()
                        ? 'rgba(245,158,11,0.3)'
                        : 'rgba(255,255,255,0.04)',
                      border: i === new Date().getDay()
                        ? '1px solid rgba(245,158,11,0.5)'
                        : '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i === new Date().getDay() && (
                        <span style={{ fontSize: 14 }}>🔥</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                Day 1 streak started 🔥
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={saving}
              style={saving ? { ...btn, opacity: 0.6 } : btn}
            >
              {saving ? 'Setting up your feed...' : 'Start creating →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
