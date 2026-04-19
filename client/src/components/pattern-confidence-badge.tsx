interface PatternConfidenceBadgeProps {
  signal_strength: 'strong' | 'building' | 'emerging';
  video_count: number;
  topic_cluster?: string | null;
  sub_niche?: string | null;
  cluster_level?: 2 | 3 | null;
  platform?: string | null;
  size?: 'sm' | 'md';
}

export function PatternConfidenceBadge({
  signal_strength,
  video_count,
  topic_cluster,
  sub_niche,
  cluster_level,
  platform,
  size = 'md',
}: PatternConfidenceBadgeProps) {
  const config = {
    strong:   { label: 'Strong',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)'   },
    building: { label: 'Building', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    emerging: { label: 'Emerging', color: '#a78bfa', bg: 'rgba(124,92,255,0.10)', border: 'rgba(124,92,255,0.25)' },
  }[signal_strength];

  const niche   = sub_niche || topic_cluster || null;
  const level   = cluster_level ?? 2;
  const plat    = platform || 'tiktok';
  const isSmall = size === 'sm';

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: isSmall ? 6 : 8,
      padding: isSmall ? '4px 10px' : '6px 14px',
      borderRadius: 20,
      background: config.bg,
      border: `1px solid ${config.border}`,
    }}>
      <div style={{
        width: isSmall ? 6 : 7,
        height: isSmall ? 6 : 7,
        borderRadius: '50%',
        background: config.color,
        boxShadow: `0 0 6px ${config.color}`,
        flexShrink: 0,
      }} />

      <span style={{
        fontSize: isSmall ? 10 : 11,
        fontWeight: 700,
        color: config.color,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        {config.label}
      </span>

      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>·</span>
      <span style={{ fontSize: isSmall ? 10 : 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
        {video_count} videos
      </span>

      {niche && (
        <>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>·</span>
          <span style={{ fontSize: isSmall ? 10 : 11, color: 'rgba(255,255,255,0.4)' }}>
            {niche.replace(/_/g, ' ')} · {plat}
          </span>
        </>
      )}

      {level === 3 && (
        <>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>·</span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: '#7C5CFF',
            background: 'rgba(124,92,255,0.15)', padding: '1px 6px', borderRadius: 10,
          }}>
            L3
          </span>
        </>
      )}
    </div>
  );
}
