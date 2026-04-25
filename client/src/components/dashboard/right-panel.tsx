import { usePlaybook } from "@/hooks/use-playbook";

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const ACTIVITY = [
  { dot: '#22c55e', text: 'Finance signal updated 2h ago' },
  { dot: '#f59e0b', text: 'AI Tools — new pattern rising' },
  { dot: '#7C5CFF', text: '4,604 videos analyzed today' },
  { dot: '#a78bfa', text: 'Pattern Engine refreshed 1h ago' },
];

const PLAYBOOK_LABELS = [
  { key: 'signal',   label: "Check today's signal" },
  { key: 'patterns', label: 'Pick a pattern' },
  { key: 'brief',    label: 'Create your video' },
  { key: 'track',    label: 'Track performance' },
];

export function RightPanel() {
  const { playbook } = usePlaybook();

  const tasks = playbook?.tasks ?? { signal: false, patterns: false, brief: false, track: false };
  const streak = playbook?.streak ?? 0;

  // Build 7-day streak dots: last `streak` days filled, last one is "today"
  const dotStates = DAYS.map((_, i) => {
    const idx7 = i; // 0 = oldest, 6 = today
    if (idx7 === 6) return streak > 0 ? 'today' : 'empty';
    if (6 - idx7 < streak) return 'done';
    return 'empty';
  });

  return (
    <div style={{
      width: 210, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 16,
      paddingTop: 4,
    }}>

      {/* Section: Today's Playbook */}
      <div style={{
        background: '#0f1118', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '14px 14px 10px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
          Today's Playbook
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PLAYBOOK_LABELS.map(({ key, label }) => {
            const done = !!(tasks as any)[key];
            return (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 9px', borderRadius: 8,
                  background: done ? 'rgba(34,197,94,0.08)' : 'transparent',
                  border: `1px solid ${done ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${done ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  fontSize: 9, color: '#22c55e',
                }}>
                  {done && '✓'}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: done ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.7)',
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Your Streak */}
      <div style={{
        background: '#0f1118', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '14px 14px 12px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
          Your Streak
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          {DAYS.map((d, i) => {
            const state = dotStates[i];
            const bg = state === 'today'
              ? 'rgba(124,92,255,0.45)'
              : state === 'done'
              ? 'rgba(124,92,255,0.2)'
              : 'rgba(255,255,255,0.04)';
            const color = state === 'today' ? '#fff' : state === 'done' ? '#a78bfa' : 'rgba(255,255,255,0.15)';
            const outline = state === 'today' ? '1px solid rgba(124,92,255,0.6)' : 'none';

            return (
              <div
                key={i}
                style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: bg, outline,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color,
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {streak > 0 ? `${streak} day streak 🔥` : 'Start your streak today'}
        </div>
      </div>

      {/* Section: Signal Activity */}
      <div style={{
        background: '#0f1118', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '14px 14px 12px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
          Signal Activity
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ACTIVITY.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.dot, flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
