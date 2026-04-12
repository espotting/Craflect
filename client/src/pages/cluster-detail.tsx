import { DashboardLayout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, Zap, Flame } from "lucide-react";

interface ClusterVideo {
  id: string;
  hook_text: string | null;
  virality_score: number | null;
  thumbnail_url: string | null;
  views: number | null;
  niche_cluster: string | null;
}

interface ClusterDetail {
  id: string;
  cluster_label: string | null;
  dominant_hook_type: string | null;
  trend_status: string | null;
  velocity_7d: number | null;
  video_count: number | null;
  avg_virality_score: number | null;
  videos: ClusterVideo[] | null;
}

const NICHE_GRADIENTS: Record<string, string> = {
  finance: 'linear-gradient(135deg,#1e3a8a,#2563eb,#06b6d4)',
  ai_tools: 'linear-gradient(135deg,#4c1d95,#7c3aed,#db2777)',
  online_business: 'linear-gradient(135deg,#7c2d12,#ea580c,#fbbf24)',
  productivity: 'linear-gradient(135deg,#064e3b,#059669,#84cc16)',
  content_creation: 'linear-gradient(135deg,#1e1b4b,#4338ca,#7c3aed)',
  default: 'linear-gradient(135deg,#1e1b4b,#4338ca,#6d28d9)',
};

function formatViews(n: number | null): string {
  if (!n) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

export default function ClusterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: cluster, isLoading } = useQuery<ClusterDetail | null>({
    queryKey: ["/api/cluster", id],
    queryFn: () => fetch(`/api/cluster/${id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!cluster) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto text-center py-20">
          <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">Cluster not found</h3>
          <Button variant="outline" className="border-slate-700 text-slate-300 mt-4" onClick={() => navigate("/opportunities")}>
            ← Back to Opportunities
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const videos = cluster.videos || [];
  const gradient = NICHE_GRADIENTS[cluster.dominant_hook_type || ''] || NICHE_GRADIENTS.default;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <button
          onClick={() => navigate("/opportunities")}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", marginBottom: 24 }}
        >
          <ArrowLeft size={16} /> Back to Opportunities
        </button>

        <div style={{ background: gradient, borderRadius: 16, padding: "28px 32px", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 16 }}>
            <div>
              {cluster.trend_status === 'emerging' && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>
                  <Flame size={12} /> EMERGING
                </div>
              )}
              {cluster.trend_status === 'trending' && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(124,92,255,0.2)", border: "1px solid rgba(124,92,255,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 12 }}>
                  <Zap size={12} /> TRENDING
                </div>
              )}
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 8px", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
                {cluster.cluster_label || cluster.dominant_hook_type?.replace(/_/g, ' ') || "Viral Pattern Cluster"}
              </h1>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", margin: 0 }}>
                {cluster.video_count || videos.length} videos · avg score {Math.round(cluster.avg_virality_score || 0)}
                {cluster.velocity_7d ? ` · +${Math.round(cluster.velocity_7d)} this week` : ''}
              </p>
            </div>
            <Button
              onClick={() => navigate(`/create?patternId=${id}`)}
              style={{ background: "#fff", color: "#7C5CFF", border: "none", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            >
              Use in Studio →
            </Button>
          </div>
        </div>

        {videos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => navigate(`/create?videoId=${video.id}`)}
                style={{ borderRadius: 12, overflow: "hidden", background: NICHE_GRADIENTS[video.niche_cluster || ''] || NICHE_GRADIENTS.default, aspectRatio: "9/16", position: "relative", cursor: "pointer" }}
              >
                {video.thumbnail_url && (
                  <img src={video.thumbnail_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%)", padding: "10px 12px", display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }}>
                  {video.virality_score && (
                    <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, marginBottom: 4 }}>SCORE {video.virality_score}</div>
                  )}
                  <p style={{ fontSize: 11, color: "#fff", fontWeight: 600, margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
                    {video.hook_text || "Pattern video"}
                  </p>
                  {video.views && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{formatViews(video.views)} views</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center" as const, padding: "48px 0", color: "rgba(255,255,255,0.4)" }}>
            <TrendingUp style={{ width: 40, height: 40, margin: "0 auto 16px" }} />
            <p>No videos in this cluster yet</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
