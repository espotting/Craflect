import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Zap,
  Flame,
  BarChart3,
  Target,
  Coins,
  Play,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VideoCardV2, type VideoCardData } from "@/components/video-card-v2";

// ─── Niche gradients (Netflix-style thumbnails) ───────────────────────────────

const NICHE_GRADIENTS: Record<string, string> = {
  finance: 'linear-gradient(135deg,#1e3a8a,#2563eb,#06b6d4)',
  ai_tools: 'linear-gradient(135deg,#4c1d95,#7c3aed,#db2777)',
  online_business: 'linear-gradient(135deg,#7c2d12,#ea580c,#fbbf24)',
  productivity: 'linear-gradient(135deg,#064e3b,#059669,#84cc16)',
  content_creation: 'linear-gradient(135deg,#1e1b4b,#4338ca,#7c3aed)',
  entrepreneurship: 'linear-gradient(135deg,#7c2d12,#b45309,#d97706)',
  default: 'linear-gradient(135deg,#1e1b4b,#4338ca,#6d28d9)',
};
function getNicheGradient(niche?: string | null): string {
  return NICHE_GRADIENTS[niche || ''] || NICHE_GRADIENTS.default;
}

// ─── PatternCard ──────────────────────────────────────────────────────────────

function PatternCard({ pattern }: { pattern: any }) {
  const [, nav] = useLocation();
  return (
    <div style={{
      flex: '0 0 220px', background: 'rgba(124,92,255,0.06)',
      border: '1px solid rgba(124,92,255,0.2)', borderRadius: 12,
      padding: 14, cursor: 'pointer',
    }}>
      <div style={{ marginBottom: 8 }}>
        {pattern.trend_status === 'emerging' &&
          <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                         color: '#ef4444', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 600 }}>🔥 Emerging</span>}
        {pattern.trend_status === 'trending' &&
          <span style={{ background: 'rgba(124,92,255,0.15)', border: '1px solid rgba(124,92,255,0.4)',
                         color: '#a78bfa', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 600 }}>⚡ Trending</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', marginBottom: 6 }}>
        {pattern.pattern_label || 'Pattern'}
      </div>
      {pattern.hook_template && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(0,0,0,0.3)',
                      padding: 8, borderRadius: 6, color: 'rgba(255,255,255,0.7)',
                      lineHeight: 1.5, marginBottom: 8 }}>
          {pattern.hook_template}
        </div>
      )}
      {pattern.why_it_works && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 8 }}>
          {pattern.why_it_works}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Avg {Math.round(pattern.avg_virality_score || 0)} score
        </span>
        <span onClick={() => nav(`/create?patternId=${pattern.pattern_id || pattern.id}`)}
              style={{ fontSize: 11, color: '#7C5CFF', fontWeight: 600, cursor: 'pointer' }}>
          Use in Studio →
        </span>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, isEmerging, onSeeAll }: { title: string; isEmerging?: boolean; onSeeAll?: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%',
                      background: isEmerging ? '#ef4444' : '#7C5CFF' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{title}</span>
      </div>
      {onSeeAll && (
        <span onClick={onSeeAll}
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
          See all →
        </span>
      )}
    </div>
  );
}

// ─── Horizontal scroll row ────────────────────────────────────────────────────

const hScrollStyle: React.CSSProperties = {
  display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
  scrollbarWidth: 'thin' as any,
};

// ─── Daily Brief ──────────────────────────────────────────────────────────────

function DailyBrief() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/daily-brief'],
    refetchInterval: 6 * 60 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (!data) return null;

  return (
    <div style={{
      background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)',
      borderRadius: 16, padding: '20px 24px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{data.date}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          {data.brief?.headline}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 8 }}>
          {data.brief?.summary}
        </div>
        {data.brief?.action && (
          <div style={{ fontSize: 13, color: '#10b981', fontStyle: 'italic' }}>
            → {data.brief.action}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        {data.emergingCount > 0 && (
          <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                         color: '#ef4444', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
            🔥 {data.emergingCount} Emerging
          </span>
        )}
        {data.declining?.length > 0 && (
          <span style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.3)',
                         color: '#94a3b8', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
            📉 {data.declining.length} Declining
          </span>
        )}
        <button
          onClick={() => navigate('/opportunities?filter=emerging')}
          style={{ background: 'rgba(124,92,255,0.2)', border: '1px solid rgba(124,92,255,0.4)',
                   color: '#a78bfa', borderRadius: 10, padding: '8px 16px', fontSize: 13,
                   fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          See opportunities →
        </button>
      </div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ViralPlay {
  hook: string;
  format: string;
  topic: string;
  platform: string | null;
  viralityScore: number;
  viewRange: string;
  confidence: number;
  videoCount: number;
  whyItWorks: string;
  trendClassification: string | null;
}

interface TrendingOpportunity {
  id: string;
  hook: string;
  format: string;
  topic: string;
  platform: string;
  viralityScore: number;
  viewRange: string;
  views: number | null;
  thumbnailUrl: string | null;
  whyItWorks?: string;
  videoCount?: number;
  confidence?: number;
  patternId?: string;
}

interface TrendingHook {
  hook: string;
  hookType: string | null;
  topic: string | null;
  avgVirality: number;
  usageCount: number;
}

interface TrendingNiche {
  niche: string;
  label: string;
  videoCount: number;
  avgVirality: number;
  topScore: number;
}

interface CreditsInfo {
  credits: number;
  maxCredits: number;
  plan: string;
  costs: Record<string, number>;
  estimatedVideos: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getViralityColor(score: number): string {
  if (score >= 80) return "text-red-400";
  if (score >= 65) return "text-orange-400";
  if (score >= 50) return "text-yellow-400";
  return "text-green-400";
}

function getTrendBadge(score: number, classification?: string | null) {
  if (classification === "rising" || score >= 80)
    return { label: "Hot", color: "bg-red-500/20 text-red-400 border border-red-500/30" };
  if (score >= 65)
    return { label: "Rising", color: "bg-orange-500/20 text-orange-400 border border-orange-500/30" };
  return { label: "Stable", color: "bg-green-500/20 text-green-400 border border-green-500/30" };
}

// Construit l'URL Studio avec tout le contexte
function buildStudioUrl(opp: {
  hook: string;
  format: string;
  topic?: string;
  viralityScore?: number;
  videoCount?: number;
  whyItWorks?: string;
  patternId?: string;
  confidence?: number;
}): string {
  const params = new URLSearchParams({ hook: opp.hook, format: opp.format });
  if (opp.topic) params.set("topic", opp.topic);
  if (opp.viralityScore) params.set("viralityScore", String(opp.viralityScore));
  if (opp.videoCount) params.set("videoCount", String(opp.videoCount));
  if (opp.whyItWorks) params.set("whyItWorks", encodeURIComponent(opp.whyItWorks));
  if (opp.patternId) params.set("patternId", opp.patternId);
  if (opp.confidence) params.set("confidence", String(opp.confidence));
  return `/create?${params.toString()}`;
}

// ─── Viral Play of the Day ────────────────────────────────────────────────────

function ViralPlayCard({
  viralPlay,
  onNavigate,
}: {
  viralPlay: ViralPlay;
  onNavigate: (path: string) => void;
}) {
  const trend = getTrendBadge(viralPlay.viralityScore, viralPlay.trendClassification);

  return (
    <div className="relative bg-gradient-to-br from-purple-900/40 to-fuchsia-900/30 rounded-2xl p-6 border border-purple-500/30 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-purple-300 font-semibold text-sm">Viral Play of the Day</span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${trend.color}`}>
            {trend.label}
          </span>
        </div>

        <p className="text-white text-xl font-bold mb-2 leading-snug">"{viralPlay.hook}"</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs capitalize">
            {viralPlay.format?.replace(/_/g, " ")}
          </Badge>
          <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs capitalize">
            {viralPlay.topic}
          </Badge>
          {viralPlay.platform && (
            <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
              {viralPlay.platform}
            </Badge>
          )}
        </div>

        {/* Data source — visible, pas abstraite */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${getViralityColor(viralPlay.viralityScore)}`}>
              {viralPlay.viralityScore}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Virality Score</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">{viralPlay.viewRange}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Est. Views</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-white">{viralPlay.videoCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Videos Analyzed</div>
          </div>
        </div>

        {viralPlay.whyItWorks && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 mb-4">
            <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-slate-300 text-xs">
              <span className="text-amber-400 font-medium">Why it works: </span>
              {viralPlay.whyItWorks}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
            onClick={() => onNavigate(buildStudioUrl({
              hook: viralPlay.hook,
              format: viralPlay.format,
              topic: viralPlay.topic,
              viralityScore: viralPlay.viralityScore,
              videoCount: viralPlay.videoCount,
              whyItWorks: viralPlay.whyItWorks,
              confidence: viralPlay.confidence,
            }))}
            data-testid="button-use-viral-play"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Use in Studio
          </Button>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300"
            onClick={() => onNavigate("/opportunities")}
            data-testid="button-see-similar"
          >
            See Similar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Stats ───────────────────────────────────────────────────────────

interface HomeStats {
  totalVideos: number;
  highPerforming: number;
  avgVirality: number;
  activeNiches: number;
  patternsDetected: number;
}

interface AlertItem {
  id: string;
  dominant_hook_type: string | null;
  dominant_niche: string | null;
  dominant_structure: string | null;
  avg_virality_score: number | null;
  velocity_7d: number | null;
  trend_status: string;
  video_count: number;
  pattern_label: string | null;
  hook_template: string | null;
  why_it_works: string | null;
}

function PipelineStats({
  homeStats,
}: {
  homeStats: HomeStats | undefined;
}) {
  const stats = [
    {
      label: "Videos Analyzed",
      value: homeStats?.totalVideos ? homeStats.totalVideos.toLocaleString() : "—",
      icon: BarChart3,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "High Performing",
      value: homeStats?.highPerforming ? homeStats.highPerforming.toLocaleString() : "—",
      icon: Target,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Avg Virality Score",
      value: homeStats?.avgVirality ? homeStats.avgVirality.toFixed(1) : "—",
      icon: Zap,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Active Niches",
      value: homeStats?.activeNiches ? String(homeStats.activeNiches) : "—",
      icon: TrendingUp,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4" data-testid="pipeline-stats">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-slate-900/50 rounded-xl p-4 border border-slate-800"
          data-testid={`stat-${i}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs">{stat.label}</span>
            <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Emerging Now ─────────────────────────────────────────────────────────────

function EmergingNow({
  alerts,
  onNavigate,
}: {
  alerts: AlertItem[];
  onNavigate: (path: string) => void;
}) {
  if (!alerts.length) return null;

  return (
    <section data-testid="section-emerging-now">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400" />
            Emerging Now
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Trends gaining momentum in your niches</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-slate-900/50 rounded-xl p-5 border border-slate-800 hover:border-purple-500/30 transition-colors cursor-pointer"
            onClick={() => onNavigate("/opportunities")}
            data-testid={`alert-card-${alert.id}`}
          >
            <div className="flex items-center justify-between mb-3">
              <Badge
                className={
                  alert.trend_status === "emerging"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                }
              >
                {alert.trend_status === "emerging" ? "Emerging" : "Trending"}
              </Badge>
              <span className="text-slate-500 text-xs">{alert.video_count} videos</span>
            </div>

            {alert.pattern_label && (
              <p className="text-white font-semibold text-sm mb-1">{alert.pattern_label}</p>
            )}

            <div className="flex flex-wrap gap-1.5 mb-3">
              {alert.dominant_hook_type && (
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs capitalize">
                  {alert.dominant_hook_type.replace(/_/g, " ")}
                </Badge>
              )}
              {alert.dominant_niche && (
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs capitalize">
                  {alert.dominant_niche.replace(/_/g, " ")}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 text-xs font-medium">+{alert.velocity_7d} this week</span>
              </div>
              {alert.avg_virality_score && (
                <span className={`text-sm font-bold ${getViralityColor(alert.avg_virality_score)}`}>
                  {Math.round(alert.avg_virality_score)}
                </span>
              )}
            </div>

            {alert.why_it_works && (
              <p className="text-slate-400 text-xs mt-2 line-clamp-2">{alert.why_it_works}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Trending Patterns ────────────────────────────────────────────────────────

function TrendingPatterns({
  trending,
  onNavigate,
}: {
  trending: TrendingOpportunity[];
  onNavigate: (path: string) => void;
}) {
  const { toast } = useToast();

  const handleSave = async (opp: TrendingOpportunity) => {
    try {
      await apiRequest("POST", "/api/ideas/save", {
        hook: opp.hook,
        format: opp.format,
        topic: opp.topic,
        opportunityScore: opp.viralityScore,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({ title: "Idea saved" });
    } catch {}
  };

  const videos: VideoCardData[] = trending.slice(0, 4).map((opp) => ({
    id: opp.id,
    hook: opp.hook,
    format: opp.format,
    views: opp.viewRange,
    viralityScore: opp.viralityScore,
    platform: opp.platform,
    thumbnail: opp.thumbnailUrl || undefined,
  }));

  return (
    <section data-testid="section-trending-patterns">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Trending Patterns
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Top performing content right now</p>
        </div>
        <Button
          variant="outline"
          className="border-slate-700 text-slate-300"
          onClick={() => onNavigate("/opportunities")}
          data-testid="button-see-all"
        >
          See All
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {videos.map((video) => {
          const opp = trending.find((o) => o.id === video.id);
          return (
            <VideoCardV2
              key={video.id}
              video={video}
              onCreateSimilar={() => opp && onNavigate(buildStudioUrl(opp))}
              onAnalyze={() => {}}
              onSave={() => opp && handleSave(opp)}
            />
          );
        })}
      </div>
    </section>
  );
}

// ─── Hook Performance ─────────────────────────────────────────────────────────

function HookPerformance({ hooks }: { hooks: TrendingHook[] }) {
  return (
    <section data-testid="section-hook-performance">
      <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-yellow-400" />
        Hook Performance
      </h2>
      <div className="grid grid-cols-5 gap-3">
        {hooks.slice(0, 5).map((hook, i) => (
          <div
            key={i}
            className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 text-center"
            data-testid={`hook-card-${i}`}
          >
            <p className="text-white font-medium text-sm capitalize mb-1">
              {hook.hookType?.replace(/_/g, " ") || "Hook"}
            </p>
            <p className="text-slate-400 text-xs mb-2">{hook.usageCount} uses</p>
            <div className={`text-2xl font-bold ${getViralityColor(hook.avgVirality)}`}>
              {Math.round(hook.avgVirality)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">avg score</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Trending Niches ──────────────────────────────────────────────────────────

function TrendingNiches({
  niches,
  onNavigate,
}: {
  niches: TrendingNiche[];
  onNavigate: (path: string) => void;
}) {
  return (
    <section data-testid="section-trending-niches">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Trending Niches
        </h2>
      </div>
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 divide-y divide-slate-800">
        {niches.slice(0, 6).map((niche, i) => {
          const trend = getTrendBadge(niche.avgVirality);
          return (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors cursor-pointer"
              onClick={() => onNavigate(`/opportunities?niche=${niche.niche}`)}
              data-testid={`niche-row-${i}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-slate-500 w-5 text-sm">{i + 1}</span>
                <span className="text-white font-medium text-sm">{niche.label}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-400 text-sm">{niche.videoCount.toLocaleString()} videos</span>
                <span className="text-slate-400 text-sm">avg {Math.round(niche.avgVirality)}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${trend.color}`}>
                  {trend.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── CTA Studio ───────────────────────────────────────────────────────────────

function StudioCTA({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section
      className="bg-gradient-to-r from-purple-900/30 to-fuchsia-900/30 rounded-2xl p-8 border border-purple-500/20"
      data-testid="section-cta-studio"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to create your next viral video?
          </h2>
          <p className="text-slate-400">
            Turn these insights into content — hook, script, blueprint in 4 steps.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-14 text-lg font-semibold rounded-xl shrink-0"
          onClick={() => onNavigate("/create")}
          data-testid="button-open-studio"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Open Studio
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </section>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-72 w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const { data: viralPlay, isLoading: loadingPlay } = useQuery<ViralPlay | null>({
    queryKey: ["/api/home/viral-play"],
  });
  const { data: trending, isLoading: loadingTrending } = useQuery<TrendingOpportunity[]>({
    queryKey: ["/api/home/trending-opportunities"],
  });
  const { data: hooks } = useQuery<TrendingHook[]>({
    queryKey: ["/api/home/trending-hooks"],
  });
  const { data: niches } = useQuery<TrendingNiche[]>({
    queryKey: ["/api/home/trending-niches"],
  });
  const { data: homeStats } = useQuery<HomeStats>({
    queryKey: ["/api/home/stats"],
  });
  const { data: alertsData } = useQuery<{ alerts: AlertItem[]; count: number }>({
    queryKey: ["/api/alerts"],
  });
  const { data: credits } = useQuery<CreditsInfo>({
    queryKey: ["/api/credits"],
  });

  const { data: feedData } = useQuery<{ videos: any[]; personalizedFor: string | null }>({
    queryKey: ["/api/feed/personalized"],
  });

  const isLoading = loadingPlay || loadingTrending;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-16" data-testid="page-dashboard">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-page-title">
              Intelligence
            </h1>
            <p className="text-slate-400 text-sm">
              {trending?.length
                ? `${trending.length} patterns analyzed · updated today`
                : "Your content intelligence feed"}
            </p>
          </div>
          {credits && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800" data-testid="credits-counter">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">{credits.credits}</span>
              <span className="text-xs text-slate-400">/ {credits.maxCredits}</span>
            </div>
          )}
        </div>

        {/* Daily Brief — always shown above fold */}
        <div className="mb-8">
          <DailyBrief />
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-8">

            {/* 1 — Viral Play of the Day */}
            {viralPlay && (
              <ViralPlayCard viralPlay={viralPlay} onNavigate={navigate} />
            )}

            {/* 2 — Pipeline stats */}
            <PipelineStats homeStats={homeStats} />

            {/* Netflix Section 1 — Emerging Now (horizontal scroll) */}
            {alertsData?.alerts && alertsData.alerts.length > 0 && (
              <section>
                <SectionHeader
                  title={`🔥 Emerging Now`}
                  isEmerging
                  onSeeAll={() => navigate('/opportunities?filter=emerging')}
                />
                <div style={hScrollStyle}>
                  {alertsData.alerts.slice(0, 5).map((alert: AlertItem) => {
                    const nicheGrad = getNicheGradient(alert.dominant_niche);
                    return (
                      <div
                        key={alert.id}
                        onClick={() => navigate('/opportunities')}
                        style={{
                          flex: '0 0 200px', borderRadius: 12, overflow: 'hidden',
                          background: nicheGrad, cursor: 'pointer', position: 'relative',
                          height: 140,
                        }}
                      >
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%)',
                          padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                        }}>
                          <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginBottom: 3 }}>🔥 EMERGING</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                            {alert.pattern_label || alert.dominant_hook_type?.replace(/_/g, ' ') || 'Emerging Pattern'}
                          </div>
                          {alert.velocity_7d && (
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                              +{Math.round(alert.velocity_7d as number)} this week
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Netflix Section 2 — Recommended Patterns (PatternCard) */}
            {feedData?.videos && feedData.videos.length > 0 && (
              <section>
                <SectionHeader
                  title="Recommended Patterns — Match Your Style"
                  onSeeAll={() => navigate('/opportunities')}
                />
                <div style={hScrollStyle}>
                  {feedData.videos
                    .filter((v: any) => v.trend_status)
                    .slice(0, 8)
                    .map((v: any) => (
                      <PatternCard
                        key={v.id}
                        pattern={{
                          pattern_id: v.id,
                          pattern_label: v.hook_type_v2?.replace(/_/g, ' ') || 'Pattern',
                          hook_template: v.hook_text,
                          why_it_works: null,
                          avg_virality_score: v.virality_score,
                          trend_status: v.trend_status,
                        }}
                      />
                    ))}
                </div>
              </section>
            )}

            {/* Netflix Section 3 — Top in Your Niche This Week */}
            {trending && trending.length > 0 && (
              <section>
                <SectionHeader
                  title={`Top in ${feedData?.personalizedFor?.replace(/_/g, ' ') || 'Your Niche'} This Week`}
                  onSeeAll={() => navigate('/opportunities')}
                />
                <div style={hScrollStyle}>
                  {trending.slice(0, 6).map((opp) => {
                    const nicheGrad = getNicheGradient(undefined);
                    return (
                      <div
                        key={opp.id}
                        style={{
                          flex: '0 0 200px', borderRadius: 12, overflow: 'hidden',
                          background: opp.thumbnailUrl ? undefined : nicheGrad,
                          backgroundImage: opp.thumbnailUrl ? `url(${opp.thumbnailUrl})` : undefined,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          cursor: 'pointer', position: 'relative', height: 140,
                        }}
                        onClick={() => navigate(buildStudioUrl(opp))}
                      >
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.1) 60%)',
                          padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                        }}>
                          <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, marginBottom: 3 }}>
                            SCORE {opp.viralityScore}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', lineHeight: 1.3,
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                            {opp.hook}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Hook performance */}
            {hooks && hooks.length > 0 && (
              <HookPerformance hooks={hooks} />
            )}

            {/* Trending niches */}
            {niches && niches.length > 0 && (
              <TrendingNiches niches={niches} onNavigate={navigate} />
            )}

            {/* CTA Studio */}
            <StudioCTA onNavigate={navigate} />

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
