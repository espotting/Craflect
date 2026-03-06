import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Eye,
  Zap,
  Layers,
  TrendingUp,
  Sparkles,
  Loader2,
} from "lucide-react";

interface ContentScorecardProps {
  hook: string;
  format?: string;
  topic?: string;
  script?: string;
  cta?: string;
  visible: boolean;
}

interface Prediction {
  viral_probability: number;
  predicted_views: { low: number; high: number; formatted: string };
  based_on: number;
}

interface Improvement {
  improved_hook: string;
  improved_format: string;
  improved_cta: string;
  tips: string[];
}

export function ContentScorecard({ hook, format, topic, script, cta, visible }: ContentScorecardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [improvement, setImprovement] = useState<Improvement | null>(null);

  const predictMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/predict/views", {
        hook,
        format: format || undefined,
        topic: (topic && topic !== "none") ? topic : undefined,
        script: script || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPrediction(data);
    },
  });

  const improveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/predict/improve", {
        hook,
        format: format || undefined,
        topic: (topic && topic !== "none") ? topic : undefined,
        script: script || undefined,
        cta: cta || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setImprovement(data);
    },
    onError: () => {
      toast({ title: "Failed to generate improvements", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (visible && hook && !prediction && !predictMutation.isPending) {
      predictMutation.mutate();
    }
  }, [visible, hook]);

  if (!visible) return null;

  const hookLength = hook.length;
  const hookStrength = hookLength > 15 && hookLength < 80 && /[?!]/.test(hook) ? "strong" : hookLength > 10 ? "medium" : "weak";
  const patternMatch = prediction && prediction.based_on > 5 ? "high" : prediction && prediction.based_on > 0 ? "medium" : "low";
  const trendStrength = prediction && prediction.viral_probability >= 60 ? "rising" : prediction && prediction.viral_probability >= 40 ? "stable" : "declining";

  const strengthColor = (val: string) => {
    if (val === "strong" || val === "high" || val === "rising") return "text-emerald-500";
    if (val === "medium" || val === "stable") return "text-yellow-500";
    return "text-red-400";
  };

  const strengthLabel = (val: string) => {
    const labels: Record<string, string> = {
      strong: t.scriptGenerator.strong,
      medium: t.scriptGenerator.medium,
      weak: t.scriptGenerator.weak,
      high: t.scriptGenerator.high,
      low: t.scriptGenerator.low,
      rising: t.scriptGenerator.rising,
      stable: t.scriptGenerator.stable,
      declining: t.scriptGenerator.declining,
    };
    return labels[val] || val;
  };

  const viralScore = prediction?.viral_probability || 0;
  const viralColor = viralScore >= 70 ? "text-emerald-500" : viralScore >= 50 ? "text-yellow-500" : "text-red-400";

  return (
    <Card className="border-primary/20 bg-primary/[0.02]" data-testid="content-scorecard">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          {t.scriptGenerator.scorecard}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {predictMutation.isPending ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Analyzing...</span>
          </div>
        ) : prediction ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-border/50">
                <Zap className="w-4 h-4 text-primary mb-1" />
                <span className="text-[10px] text-muted-foreground">{t.scriptGenerator.viralScore}</span>
                <span className={`text-xl font-bold ${viralColor}`} data-testid="text-scorecard-viral">{viralScore}</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-border/50">
                <Eye className="w-4 h-4 text-primary mb-1" />
                <span className="text-[10px] text-muted-foreground">{t.scriptGenerator.predictedViewsRange}</span>
                <span className="text-sm font-bold text-foreground" data-testid="text-scorecard-views">{prediction.predicted_views.formatted}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> {t.scriptGenerator.hookStrength}
                </span>
                <span className={`font-medium ${strengthColor(hookStrength)}`}>{strengthLabel(hookStrength)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> {t.scriptGenerator.patternMatch}
                </span>
                <span className={`font-medium ${strengthColor(patternMatch)}`}>{strengthLabel(patternMatch)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> {t.scriptGenerator.trendStrength}
                </span>
                <span className={`font-medium ${strengthColor(trendStrength)}`}>{strengthLabel(trendStrength)}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 mt-2"
              onClick={() => improveMutation.mutate()}
              disabled={improveMutation.isPending}
              data-testid="button-improve-scorecard"
            >
              {improveMutation.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> {t.scriptGenerator.improvingScore}</>
              ) : (
                <><Sparkles className="w-3 h-3" /> {t.scriptGenerator.improveScore}</>
              )}
            </Button>

            {improvement && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="bg-primary/5 p-2.5 rounded-md border border-primary/20">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t.scriptGenerator.hookStrength}</p>
                  <p className="text-xs" data-testid="text-scorecard-improved-hook">{improvement.improved_hook}</p>
                </div>
                {improvement.tips && improvement.tips.length > 0 && (
                  <div className="space-y-1">
                    {improvement.tips.slice(0, 3).map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[8px] mt-0.5 shrink-0">{i + 1}</Badge>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
