import { DashboardLayout } from "@/components/layout";
import { usePlaybook } from "@/hooks/use-playbook";
import { useLocation } from "wouter";

const TASKS = [
  {
    key: 'signal' as const,
    title: "Check today's signal",
    sub: "See what's performing in your niche right now",
    href: '/home',
    auto: true,
  },
  {
    key: 'patterns' as const,
    title: 'Scan the pattern feed',
    sub: 'Browse Trending, Rising and Stable patterns',
    href: '/patterns',
    auto: true,
  },
  {
    key: 'brief' as const,
    title: 'Create a brief from a pattern',
    sub: "Turn today's top pattern into a filming brief",
    href: '/create',
    auto: false,
  },
  {
    key: 'track' as const,
    title: "Track yesterday's video",
    sub: 'Paste a URL to see how your last video performed',
    href: '/performance',
    auto: false,
  },
];

export default function PlaybookPage() {
  const { playbook } = usePlaybook();
  const [, navigate] = useLocation();

  const tasks = playbook?.tasks || { signal: false, patterns: false, brief: false, track: false };
  const completed = playbook?.completedCount || 0;
  const streak = playbook?.streak || 0;

  return (
    <DashboardLayout>
      <div style={{ background: '#08080f', minHeight: '100vh', padding: '32px 28px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#7C5CFF', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>
            Daily Playbook
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12 }}>
            {completed}/4 completed today
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, width: 240 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg,#7C5CFF,#c026d3)',
              width: `${(completed / 4) * 100}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)',
            borderRadius: 20, padding: '5px 12px', marginBottom: 28,
          }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>
              {streak} day streak
            </span>
          </div>
        )}

        {/* Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TASKS.map((task, idx) => {
            const isDone = tasks[task.key];
            const isNext = !isDone && TASKS.slice(0, idx).every(t => tasks[t.key]);

            return (
              <div
                key={task.key}
                onClick={() => !isDone && navigate(task.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', borderRadius: 12,
                  cursor: isDone ? 'default' : 'pointer',
                  background: isDone
                    ? 'rgba(34,197,94,0.05)'
                    : isNext ? 'rgba(124,92,255,0.08)'
                    : 'rgba(255,255,255,0.03)',
                  border: isDone
                    ? '1px solid rgba(34,197,94,0.2)'
                    : isNext ? '1px solid rgba(124,92,255,0.3)'
                    : '1px solid rgba(255,255,255,0.06)',
                  opacity: !isDone && !isNext && idx > 0 ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {/* Check circle */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? '#22c55e' : isNext ? 'rgba(124,92,255,0.2)' : 'rgba(255,255,255,0.06)',
                  border: isDone ? 'none' : isNext ? '1px solid #7C5CFF' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  {isDone
                    ? <span style={{ fontSize: 14, color: '#fff' }}>✓</span>
                    : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{idx + 1}</span>
                  }
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: isDone ? 'rgba(255,255,255,0.5)' : '#fff',
                    textDecoration: isDone ? 'line-through' : 'none',
                    marginBottom: 2,
                  }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    {task.auto ? '⚡ Auto-completes when you visit' : task.sub}
                  </div>
                </div>

                {!isDone && isNext && (
                  <div style={{ fontSize: 16, color: '#7C5CFF' }}>→</div>
                )}
              </div>
            );
          })}
        </div>

        {/* All done */}
        {completed === 4 && (
          <div style={{
            marginTop: 24, padding: '16px 20px',
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 12, textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>
              Playbook complete 🎯
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              Come back tomorrow to keep your streak going
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
