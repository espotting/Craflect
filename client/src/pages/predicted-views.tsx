import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  Eye,
  Zap,
  Sparkles,
  Target,
  ArrowUpRight,
  Lightbulb,
  BarChart3,
} from "lucide-react";

interface PredictionResult {
  viral_probability: number;
  predicted_views: {
    low: number;
    high: number;
    formatted: string;
  };
  based_on: number;
}

interface ImproveResult {
  improved_hook: string;
  improved_format: string;
  improved_cta: string;
  tips: string[];
}

export default function PredictedViews() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [hook, setHook] = useState("");
  const [format, setFormat] = useState("");
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [cta, setCta] = useState("");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [improvement, setImprovement] = useState<ImproveResult | null>(null);

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
      setImprovement(null);
    },
    onError: () => {
      toast({ title: t.predictedViews.error, variant: "destructive" });
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
      toast({ title: t.predictedViews.improveError, variant: "destructive" });
    },
  });

  const probabilityColor = (p: number) => {
    if (p >= 70) return "text-emerald-500";
    if (p >= 50) return "text-yellow-500";
    return "text-red-400";
  };

  const probabilityBg = (p: number) => {
    if (p >= 70) return "bg-emerald-500";
    if (p >= 50) return "bg-yellow-500";
    return "bg-red-400";
  };

  const topicKeys = Object.keys(TOPIC_CLUSTER_LABELS) as (keyof typeof TOPIC_CLUSTER_LABELS)[];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <TrendingUp className="w-6 h-6 text-primary" />
            {t.predictedViews.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t.predictedViews.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <div>
                  <Label>{t.predictedViews.hookLabel}</Label>
                  <Input
                    value={hook}
                    onChange={(e) => setHook(e.target.value)}
                    placeholder={t.predictedViews.hookPlaceholder}
                    data-testid="input-predict-hook"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.predictedViews.formatLabel}</Label>
                    <Input
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      placeholder={t.predictedViews.formatPlaceholder}
                      data-testid="input-predict-format"
                    />
                  </div>
                  <div>
                    <Label>{t.predictedViews.topicLabel}</Label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger data-testid="select-predict-topic">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {topicKeys.map((k) => (
                          <SelectItem key={k} value={k}>{TOPIC_CLUSTER_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t.predictedViews.scriptLabel}</Label>
                  <Textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder={t.predictedViews.scriptPlaceholder}
                    className="min-h-[100px]"
                    data-testid="textarea-predict-script"
                  />
                </div>
                <div>
                  <Label>{t.predictedViews.ctaLabel}</Label>
                  <Input
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder={t.predictedViews.ctaPlaceholder}
                    data-testid="input-predict-cta"
                  />
                </div>
                <Button
                  onClick={() => predictMutation.mutate()}
                  disabled={!hook.trim() || predictMutation.isPending}
                  className="gap-2"
                  data-testid="button-predict"
                >
                  <BarChart3 className="w-4 h-4" />
                  {predictMutation.isPending ? t.predictedViews.predicting : t.predictedViews.predict}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            {!prediction && !predictMutation.isPending ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Eye className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">{t.predictedViews.noData}</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">{t.predictedViews.noDataHint}</p>
                </CardContent>
              </Card>
            ) : predictMutation.isPending ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BarChart3 className="w-8 h-8 text-primary animate-pulse mb-3" />
                  <p className="text-muted-foreground">{t.predictedViews.predicting}</p>
                </CardContent>
              </Card>
            ) : prediction ? (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-2">{t.predictedViews.viralProbability}</p>
                        <div className="relative w-32 h-32 mx-auto">
                          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                            <circle
                              cx="50" cy="50" r="42" fill="none"
                              strokeWidth="8"
                              strokeLinecap="round"
                              strokeDasharray={`${prediction.viral_probability * 2.64} 264`}
                              className={probabilityBg(prediction.viral_probability)}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-3xl font-bold ${probabilityColor(prediction.viral_probability)}`} data-testid="text-viral-probability">
                              {prediction.viral_probability}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center w-full pt-4 border-t border-border/50">
                        <p className="text-sm font-medium text-muted-foreground mb-1">{t.predictedViews.predictedRange}</p>
                        <p className="text-2xl font-bold text-foreground" data-testid="text-predicted-range">
                          {prediction.predicted_views.formatted}
                        </p>
                        {prediction.based_on > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.predictedViews.basedOn.replace("{count}", String(prediction.based_on))}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => improveMutation.mutate()}
                        disabled={improveMutation.isPending}
                        className="gap-2 w-full"
                        data-testid="button-improve"
                      >
                        <Sparkles className="w-4 h-4" />
                        {improveMutation.isPending ? t.predictedViews.improving : t.predictedViews.improve}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {improvement && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          {t.predictedViews.improvedHook}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm font-medium bg-primary/5 p-3 rounded-md border border-primary/20" data-testid="text-improved-hook">
                          {improvement.improved_hook}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          {t.predictedViews.improvedFormat}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm" data-testid="text-improved-format">{improvement.improved_format}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ArrowUpRight className="w-4 h-4 text-green-500" />
                          {t.predictedViews.improvedCta}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm" data-testid="text-improved-cta">{improvement.improved_cta}</p>
                      </CardContent>
                    </Card>

                    {improvement.tips && improvement.tips.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            {t.predictedViews.tips}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {improvement.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-tip-${i}`}>
                                <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">{i + 1}</Badge>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
