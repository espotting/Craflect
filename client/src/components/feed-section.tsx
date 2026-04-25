import { useLocation } from "wouter";
import { PatternCard, type PatternCardPattern } from "./pattern-card";
import { NICHE_LABELS } from "./video-card-v3";
import { PatternConfidenceBadge } from "./pattern-confidence-badge";

const scrollStyle: React.CSSProperties = {
  display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6,
  scrollbarWidth: 'none',
};

function getDominantSignal(patterns: PatternCardPattern[]): 'strong' | 'building' | 'emerging' {
  if (patterns.some(p => p.signal_strength === 'strong')) return 'strong';
  if (patterns.some(p => p.signal_strength === 'building')) return 'building';
  return 'emerging';
}

function PatternCardSkeleton() {
  return (
    <div style={{
      flex: '0 0 186px', height: 160,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, padding: '11px 13px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ height: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 10, width: '50%' }} />
      <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
      <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '80%' }} />
      <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '60%' }} />
    </div>
  );
}

function NicheRow({ niche, patterns, isFirst }: {
  niche: string;
  patterns: PatternCardPattern[];
  isFirst: boolean;
}) {
  const [, navigate] = useLocation();
  const dotColor = isFirst ? '#ef4444' : '#7C5CFF';
  const dominantSignal = getDominantSignal(patterns);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#fff' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
            {NICHE_LABELS[niche] || niche}
          </div>
          {patterns.length > 0 && (
            <PatternConfidenceBadge
              signal_strength={dominantSignal}
              video_count={patterns.reduce((s, p) => s + (p.video_count ?? 0), 0)}
              size="sm"
            />
          )}
        </div>
        <span
          onClick={() => navigate('/patterns?niche=' + niche)}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
        >
          See all →
        </span>
      </div>
      <div style={scrollStyle}>
        {patterns.length > 0
          ? patterns.slice(0, 6).map(p => <PatternCard key={p.pattern_id} pattern={p} />)
          : Array.from({ length: 3 }).map((_, i) => <PatternCardSkeleton key={i} />)
        }
      </div>
    </div>
  );
}

export function FeedSection({
  niches,
  platform: _platform,
  patterns,
}: {
  niches: string[];
  platform: string;
  patterns: PatternCardPattern[];
}) {
  const patternsByNiche: Record<string, PatternCardPattern[]> = {};
  niches.forEach(n => { patternsByNiche[n] = []; });
  patterns.forEach(p => {
    if (p.topic_cluster && patternsByNiche[p.topic_cluster]) {
      patternsByNiche[p.topic_cluster].push(p);
    } else if (p.topic_cluster && niches.length > 0) {
      // fallback: add to first niche if cluster not matched
      if (!patternsByNiche[niches[0]]) patternsByNiche[niches[0]] = [];
      patternsByNiche[niches[0]].push(p);
    }
  });

  return (
    <div style={{ padding: '28px 28px 40px', background: '#08080f', overflowX: 'hidden' }}>
      {niches.map((niche, idx) => (
        <NicheRow
          key={niche}
          niche={niche}
          patterns={patternsByNiche[niche] || []}
          isFirst={idx === 0}
        />
      ))}
    </div>
  );
}
