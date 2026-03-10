import { TrendingUp, Video, Eye, Sparkles, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";

export interface OpportunityData {
  id: string;
  topic: string;
  hook: string;
  format: string;
  predictedViews: string;
  confidence: number;
  trend: "rising" | "stable" | "hot";
  whyItWorks?: string;
}

interface OpportunityCardProps {
  opportunity: OpportunityData;
  featured?: boolean;
  onCreate?: (opportunity: OpportunityData) => void;
  onSeeSimilar?: (opportunity: OpportunityData) => void;
}

const trendColors: Record<string, string> = {
  hot: "text-red-400 bg-red-500/20 border-red-500/30",
  rising: "text-orange-400 bg-orange-500/20 border-orange-500/30",
  stable: "text-green-400 bg-green-500/20 border-green-500/30",
};

const trendLabels: Record<string, string> = {
  hot: "TRENDING NOW",
  rising: "RISING",
  stable: "STABLE",
};

export function OpportunityCard({ opportunity, featured = false, onCreate, onSeeSimilar }: OpportunityCardProps) {
  const { t } = useLanguage();

  if (featured) {
    return (
      <div
        className="relative bg-gradient-to-br from-purple-900/50 via-slate-900/50 to-slate-900/50 rounded-3xl p-8 border border-purple-500/30 overflow-hidden"
        data-testid="card-viral-play"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-1">
                <Sparkles className="w-3 h-3" />
                {t.dashboard?.viralPlayTitle || "VIRAL PLAY OF THE DAY"}
              </span>
              <p className="text-slate-400 text-sm">{t.dashboard?.viralPlaySubtitle || "Based on 50,000+ analyzed videos"}</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-slate-800 text-slate-300">{opportunity.topic?.replace(/_/g, " ")}</Badge>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${trendColors[opportunity.trend] || trendColors.stable}`}>
                <TrendingUp className="w-3 h-3" />
                {trendLabels[opportunity.trend] || "STABLE"}
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight" data-testid="text-viral-hook">
              "{opportunity.hook}"
            </h2>

            <div className="flex flex-wrap items-center gap-6 text-sm mb-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Video className="w-4 h-4" />
                Format: <span className="text-white font-medium capitalize">{opportunity.format?.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Eye className="w-4 h-4" />
                Predicted: <span className="text-green-400 font-medium">{opportunity.predictedViews}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="w-4 h-4" />
                Confidence: <span className="text-purple-400 font-medium">{opportunity.confidence}%</span>
              </div>
            </div>

            {opportunity.whyItWorks && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800" data-testid="text-why-it-works">
                <p className="text-slate-400 text-sm">
                  <span className="text-purple-400 font-medium">{t.dashboard?.whyItWorks || "Why it works:"}</span> {opportunity.whyItWorks}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white px-8 h-14 text-lg font-semibold rounded-xl shadow-lg shadow-purple-500/25"
              onClick={() => onCreate?.(opportunity)}
              data-testid="button-create-viral"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t.dashboard?.createThisVideo || "Create This Video"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 h-14 px-6 rounded-xl"
              onClick={() => onSeeSimilar?.(opportunity)}
              data-testid="button-see-similar"
            >
              {t.dashboard?.seeSimilar || "See Similar"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800 hover:border-purple-500/30 transition-all cursor-pointer group"
      data-testid={`opportunity-card-${opportunity.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <Badge variant="secondary" className="bg-slate-800 text-slate-300 capitalize">{opportunity.topic?.replace(/_/g, " ")}</Badge>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${trendColors[opportunity.trend] || trendColors.stable}`}>
          <TrendingUp className="w-3 h-3" />
          {opportunity.confidence}%
        </span>
      </div>

      <p className="text-white font-medium mb-4 line-clamp-2">"{opportunity.hook}"</p>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1 capitalize">
            <Video className="w-4 h-4" />
            {opportunity.format?.replace(/_/g, " ")}
          </span>
          <span className="flex items-center gap-1 text-green-400">
            <Eye className="w-4 h-4" />
            {opportunity.predictedViews}
          </span>
        </div>

        <Button
          size="sm"
          className="bg-purple-600/0 hover:bg-purple-600 text-purple-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
          onClick={() => onCreate?.(opportunity)}
          data-testid={`button-create-opp-${opportunity.id}`}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Create
        </Button>
      </div>
    </div>
  );
}
