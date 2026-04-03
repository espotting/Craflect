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

function PipelineStats({
  niches,
  trending,
}: {
  niches: TrendingNiche[] | undefined;
  trending: TrendingOpportunity[] | undefined;
}) {
  const totalVideos = niches?.reduce((sum, n) => sum + n.videoCount, 0) || 0;
  const totalPatterns = trending?.length || 0;
  const avgVirality = niches && niches.length > 0
    ? (niches.reduce((sum, n) => sum + n.avgVirality, 0) / niches.length).toFixed(1)
    : "—";

  const stats = [
    {
      label: "Videos Analyzed",
      value: totalVideos > 0 ? totalVideos.toLocaleString() : "—",
      icon: BarChart3,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Patterns Detected",
      value: totalPatterns > 0 ? totalPatterns.toString() : "—",
      icon: Target,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Avg Virality Score",
      value: avgVirality,
      icon: Zap,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Active Niches",
      value: niches?.length ? String(niches.length) : "—",
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

// ─── Trending Patterns ────────────────────────────────────────────────────────

function TrendingPatterns({
