import { DashboardLayout } from "@/components/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  Sparkles,
  ArrowRight,
  Plus,
  ExternalLink,
  Loader2,
  BarChart3,
  Target,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface PendingEntryData {
  id: string;
  platform: string;
  hook_used: string | null;
  niche: string | null;
  pattern_id: string | null;
  created_at: string;
}

interface TrackedVideo {
  id: string;
  platform_video_url: string;
  platform: string;
  predicted_views: number | null;
  actual_views: number | null;
  actual_likes: number | null;
  actual_comments: number | null;
  accuracy_score: number | null;
  last_fetched_at: string | null;
  created_at: string;
}

interface PerformanceStats {
  total_tracked: string | number;
  avg_accuracy: number | null;
  outperformed: string | number;
  underperformed: string | number;
}

interface ContentDNA {
  exists: boolean;
  dna?: {
    hook_type_performance: Record<string, { count: number; avgViews: number }>;
    total_tracked_videos: number;
    avg_prediction_accuracy: number | null;
    updated_at: string;
  };
}

function formatViews(n: number | null): string {
  if (n === null || n === 0) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function getPerformanceBadge(predicted: number | null, actual: number | null): {
  label: string; color: string; bg: string;
} {
  if (actual === null) return { label: "⏳ Pending", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  if (!predicted) return { label: "⏳ Pending", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };

  const deltaPct = Math.round(((actual - predicted) / predicted) * 100);
  const sign = deltaPct > 0 ? '+' : '';

  if (actual > predicted * 1.2) return {
    label: `🚀 ${sign}${deltaPct}% vs predicted`,
    color: "#10b981", bg: "rgba(16,185,129,0.1)",
  };
  if (actual < predicted * 0.5) return {
    label: `⚠ ${sign}${deltaPct}% vs predicted`,
    color: "#f59e0b", bg: "rgba(245,158,11,0.1)",
  };
  return {
    label: `✓ ${sign}${deltaPct}% vs predicted`,
    color: "#94a3b8", bg: "rgba(148,163,184,0.1)",
  };
}

function PendingEntry({ entry, onTrack }: {
  entry: PendingEntryData;
  onTrack: (id: string, url: string) => void;
}) {
  const [url, setUrl] = useState("");

  const platformLabel: Record<string, string> = { tiktok: 'TikTok', reels: 'Reels', shorts: 'Shorts' };

  return (
    <div style={{
      background: 'rgba(124,92,255,0.05)', border: '1px solid rgba(124,92,255,0.2)',
      borderRadius: 12, padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              background: 'rgba(124,92,255,0.18)', border: '1px solid rgba(124,92,255,0.35)',
              color: '#a78bfa', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
            }}>
              {platformLabel[entry.platform] || entry.platform}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {new Date(entry.created_at).toLocaleDateString()}
            </span>
          </div>
          {entry.hook_used && (
            <div style={{
              fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
            }}>
              "{entry.hook_used}"
            </div>
          )}
          {entry.niche && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {entry.niche.replace(/_/g, ' ')}
            </div>
          )}
        </div>
        <span style={{
          background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)',
          color: '#fb923c', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, flexShrink: 0,
        }}>
          Not published yet
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste your video URL after publishing…"
          style={{
            flex: 1, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(124,92,255,0.25)',
            borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none',
          }}
          onKeyDown={(e) => e.key === 'Enter' && url.trim() && onTrack(entry.id, url.trim())}
        />
        <button
          onClick={() => url.trim() && onTrack(entry.id, url.trim())}
          disabled={!url.trim()}
          style={{
            background: url.trim() ? 'linear-gradient(90deg, #7C5CFF, #c026d3)' : 'rgba(255,255,255,0.06)',
            border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 600, cursor: url.trim() ? 'pointer' : 'not-allowed',
            opacity: url.trim() ? 1 : 0.4, whiteSpace: 'nowrap' as const,
          }}
        >
          Start tracking →
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color?: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Icon style={{ width: 18, height: 18, color: color || '#7C5CFF' }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#ffffff' }}>{value}</div>
    </div>
  );
}

export default function PerformancePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [predictedViews, setPredictedViews] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const { data: pendingEntries = [] } = useQuery<PendingEntryData[]>({
    queryKey: ["/api/video-performance/pending"],
    refetchInterval: 30_000,
  });

  const activateMutation = useMutation({
    mutationFn: ({ id, platformVideoUrl }: { id: string; platformVideoUrl: string }) =>
      apiRequest("PATCH", `/api/video-performance/${id}`, { platformVideoUrl, status: 'published' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/video-performance/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/performance/stats"] });
      toast({ title: "Video is now being tracked!" });
    },
    onError: () => toast({ title: "Could not start tracking", variant: "destructive" }),
  });

  const { data: tracked, isLoading } = useQuery<TrackedVideo[]>({
    queryKey: ["/api/performance"],
  });

  const { data: stats } = useQuery<PerformanceStats>({
    queryKey: ["/api/performance/stats"],
  });

  const { data: dna } = useQuery<ContentDNA>({
    queryKey: ["/api/user/dna"],
  });

  const trackMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        videoUrl: url.trim(),
        platform,
      };
      if (predictedViews.trim()) {
        body.predictedViews = parseInt(predictedViews.trim(), 10);
      }
      const res = await apiRequest("POST", "/api/performance/track", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/performance/stats"] });
      setUrl("");
      setPredictedViews("");
      setShowForm(false);
      toast({ title: "Video tracked!", description: "We'll monitor its performance." });
    },
    onError: () => {
      toast({ title: "Could not track this video", variant: "destructive" });
    },
  });

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    try {
      await apiRequest("POST", `/api/performance/${id}/refresh`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/performance/stats"] });
      toast({ title: "Metrics refreshed" });
    } catch {
      toast({ title: "Could not refresh metrics", variant: "destructive" });
    } finally {
      setRefreshingId(null);
    }
  }

  const hasVideos = tracked && tracked.length > 0;
  const totalTracked = parseInt(String(stats?.total_tracked || 0)) || 0;
  const avgAccuracyPct = stats?.avg_accuracy ? Math.round(stats.avg_accuracy * 100) : 0;
  const outperformed = parseInt(String(stats?.outperformed || 0)) || 0;
  const underperformed = parseInt(String(stats?.underperformed || 0)) || 0;

  return (
    <DashboardLayout>
      <div style={{ padding: '32px', maxWidth: 1000, margin: '0 auto', color: '#ffffff' }} data-testid="page-performance">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}
              data-testid="text-page-title">
              <TrendingUp style={{ width: 28, height: 28, color: '#10b981' }} />
              Performance
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 6 }}>
              Track your published videos — predicted vs real
            </p>
          </div>
          <button
            style={{
              background: 'linear-gradient(90deg, #7C5CFF, #c026d3)', color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}
            onClick={() => setShowForm(!showForm)}
            data-testid="button-track-video"
          >
            <Plus style={{ width: 16, height: 16 }} />
            Track a Video
          </button>
        </div>

        {/* Section P — Pending entries (created from Studio) */}
        {pendingEntries.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Ready to track</h2>
              <span style={{
                background: 'rgba(251,146,60,0.14)', border: '1px solid rgba(251,146,60,0.28)',
                color: '#fb923c', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
              }}>
                {pendingEntries.length}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 0, marginBottom: 16 }}>
              Paste the URL once your video is live to start tracking performance.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingEntries.map((entry) => (
                <PendingEntry
                  key={entry.id}
                  entry={entry}
                  onTrack={(id, url) => activateMutation.mutate({ id, platformVideoUrl: url })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section D — Prediction Stats */}
        {totalTracked > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            <StatCard icon={BarChart3} label="Total Tracked" value={totalTracked} />
            <StatCard icon={Target} label="Avg Accuracy" value={avgAccuracyPct > 0 ? `${avgAccuracyPct}%` : "—"} />
            <StatCard icon={TrendingUp} label="Outperformed" value={outperformed} color="#10b981" />
            <StatCard icon={AlertTriangle} label="Underperformed" value={underperformed} color="#f59e0b" />
          </div>
        )}

        {/* Section A — Track a Video form */}
        {showForm && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,92,255,0.3)',
            borderRadius: 16, padding: 24, marginBottom: 32,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Track a Video</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input
                placeholder="https://www.tiktok.com/@user/video/123..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                onKeyDown={(e) => e.key === "Enter" && url.trim() && trackMutation.mutate()}
                data-testid="input-video-url"
                autoFocus
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 14,
                  }}
                >
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram Reels</option>
                  <option value="youtube">YouTube Shorts</option>
                </select>
                <Input
                  placeholder="Predicted views (optional)"
                  value={predictedViews}
                  onChange={(e) => setPredictedViews(e.target.value)}
                  type="number"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => trackMutation.mutate()}
                  disabled={!url.trim() || trackMutation.isPending}
                  style={{
                    background: 'linear-gradient(90deg, #7C5CFF, #c026d3)', color: '#fff', border: 'none',
                    padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    cursor: url.trim() ? 'pointer' : 'not-allowed', opacity: url.trim() ? 1 : 0.5,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  data-testid="button-confirm-track"
                >
                  {trackMutation.isPending ? <Loader2 style={{ width: 16, height: 16 }} /> : null}
                  Start Tracking
                </button>
                <button
                  onClick={() => { setShowForm(false); setUrl(""); setPredictedViews(""); }}
                  style={{
                    background: 'transparent', color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)', padding: '10px 20px',
                    borderRadius: 8, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasVideos && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <BarChart3 style={{ width: 32, height: 32, color: '#10b981' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No videos tracked yet</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, maxWidth: 360, marginBottom: 24 }}>
              Publish your video, then come back to paste the URL and track how it performs vs Craflect's prediction.
            </p>
            <button
              style={{
                background: '#7C5CFF', color: '#fff', border: 'none',
                padding: '12px 24px', borderRadius: 10, fontSize: 15, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
              onClick={() => navigate("/create")}
              data-testid="button-open-studio"
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              Open Studio
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}

        {/* Section B — My Videos */}
        {hasVideos && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Videos</h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}
              data-testid="tracked-videos-table">
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                gap: 16, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                <div>Video</div>
                <div style={{ textAlign: 'center' }}>Predicted</div>
                <div style={{ textAlign: 'center' }}>Real Views</div>
                <div style={{ textAlign: 'center' }}>Status</div>
                <div style={{ textAlign: 'center' }}>Refresh</div>
              </div>

              {tracked.map((video) => {
                const badge = getPerformanceBadge(video.predicted_views, video.actual_views);
                return (
                  <div
                    key={video.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                      gap: 16, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      alignItems: 'center',
                    }}
                    data-testid={`tracked-row-${video.id}`}
                  >
                    {/* URL + platform */}
                    <div>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize', marginBottom: 4,
                      }}>
                        {video.platform}
                      </span>
                      <a
                        href={video.platform_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}
                      >
                        <ExternalLink style={{ width: 11, height: 11, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {video.platform_video_url.replace(/https?:\/\//, "")}
                        </span>
                      </a>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                        {new Date(video.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Predicted */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#7C5CFF' }}>
                        {formatViews(video.predicted_views)}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>predicted</div>
                    </div>

                    {/* Real views */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                        {formatViews(video.actual_views)}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>real</div>
                      {video.accuracy_score !== null && (
                        <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                          {Math.round(video.accuracy_score * 100)}% accuracy
                        </div>
                      )}
                    </div>

                    {/* Performance badge */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        background: badge.bg, color: badge.color,
                        border: `1px solid ${badge.color}40`,
                      }}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Refresh */}
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleRefresh(video.id)}
                        disabled={refreshingId === video.id}
                        style={{
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.6)', padding: '6px 10px', borderRadius: 8,
                          cursor: refreshingId === video.id ? 'not-allowed' : 'pointer',
                        }}
                        data-testid={`button-refresh-${video.id}`}
                      >
                        <RefreshCw style={{ width: 13, height: 13, animation: refreshingId === video.id ? 'spin 1s linear infinite' : 'none' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section C — Content DNA */}
        <div style={{ marginTop: hasVideos ? 0 : 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Content DNA</h2>
          {!dna?.exists ? (
            <div style={{
              background: 'rgba(124,92,255,0.05)', border: '1px solid rgba(124,92,255,0.2)',
              borderRadius: 16, padding: 32, textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🧬</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#7C5CFF' }}>
                Track 3+ videos to unlock your Content DNA
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
                We'll analyze which hooks and formats work best for YOUR audience
              </p>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#7C5CFF' }}>
                    {dna.dna?.total_tracked_videos || 0}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Videos tracked</div>
                </div>
                {dna.dna?.avg_prediction_accuracy !== null && dna.dna?.avg_prediction_accuracy !== undefined && (
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>
                      {Math.round((dna.dna.avg_prediction_accuracy || 0) * 100)}%
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Avg accuracy</div>
                  </div>
                )}
              </div>

              {dna.dna?.hook_type_performance && Object.keys(dna.dna.hook_type_performance).length > 0 && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                    Hook Type Performance
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(dna.dna.hook_type_performance)
                      .sort(([, a], [, b]) => b.avgViews - a.avgViews)
                      .slice(0, 6)
                      .map(([hookType, data]) => {
                        const maxViews = Math.max(...Object.values(dna.dna!.hook_type_performance).map(d => d.avgViews));
                        const pct = maxViews > 0 ? Math.round((data.avgViews / maxViews) * 100) : 0;
                        return (
                          <div key={hookType}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                                {hookType.replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontSize: 13, color: '#7C5CFF', fontWeight: 600 }}>
                                {pct}% avg performance
                              </span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                width: `${pct}%`, height: '100%', borderRadius: 3,
                                background: 'linear-gradient(90deg, #7C5CFF, #c026d3)',
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
