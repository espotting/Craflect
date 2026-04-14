import { useLocation } from "wouter";
import { VideoCard, VideoCardSkeleton, NICHE_LABELS } from "./video-card-v3";

const scrollStyle: React.CSSProperties = {
  display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6,
  scrollbarWidth: 'none',
};

function NicheRow({ niche, videos, isFirst }: { niche: string; videos: any[]; isFirst: boolean }) {
  const [, navigate] = useLocation();
  const dotColor = isFirst ? '#ef4444' : '#7C5CFF';

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#fff' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          Emerging Now
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: 4 }}>
            {NICHE_LABELS[niche] || niche}
          </span>
        </div>
        <span
          onClick={() => navigate('/opportunities?niche=' + niche)}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
        >
          See all →
        </span>
      </div>
      <div style={scrollStyle}>
        {videos.length > 0
          ? videos.slice(0, 6).map(v => <VideoCard key={v.id} video={v} niche={niche} />)
          : Array.from({ length: 5 }).map((_, i) => <VideoCardSkeleton key={i} />)
        }
      </div>
    </div>
  );
}

function RecommendedRow({ videos }: { videos: any[] }) {
  const [, navigate] = useLocation();
  if (!videos.length) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#fff' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C5CFF', flexShrink: 0 }} />
          Recommended for you
        </div>
        <span
          onClick={() => navigate('/create')}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
        >
          See all →
        </span>
      </div>
      <div style={scrollStyle}>
        {videos.slice(0, 8).map(v => <VideoCard key={v.id} video={v} niche={v.niche_cluster || 'finance'} />)}
      </div>
    </div>
  );
}

export function FeedSection({
  niches,
  feedData,
}: {
  niches: string[];
  platform: string;
  feedData: any;
}) {
  const videos: any[] = Array.isArray(feedData?.videos) ? feedData.videos : [];

  const videosByNiche: Record<string, any[]> = {};
  niches.forEach(n => { videosByNiche[n] = []; });
  videos.forEach(v => {
    if (v.niche_cluster && videosByNiche[v.niche_cluster]) {
      videosByNiche[v.niche_cluster].push(v);
    }
  });

  return (
    <div style={{ padding: '28px 28px 40px', background: '#08080f' }}>
      {niches.map((niche, idx) => (
        <NicheRow key={niche} niche={niche} videos={videosByNiche[niche] || []} isFirst={idx === 0} />
      ))}
      <RecommendedRow videos={videos} />
    </div>
  );
}
