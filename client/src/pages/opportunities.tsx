import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  TrendingUp,
  Eye,
  ArrowRight,
  Flame,
  Zap,
  BookmarkPlus,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function getViralityColor(score: number) {
  if (score >= 80) return "text-violet-500";
  if (score >= 60) return "text-orange-500";
  return "text-yellow-500";
}

function getViralityBadge(score: number) {
  if (score >= 80) return "bg-violet-500/20 text-violet-400 border-violet-500/30";
  if (score >= 60) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
}

interface Opportunity {
  id: string;
  hook: string;
  format: string;
  topic: string;
  platform: string;
  viralityScore: number;
  viewRange: string;
  views: number | null;
  thumbnailUrl: string | null;
  hookType?: string;
  emotion?: string;
}

interface EmergingOpp {
  id: string;
  hook: string;
  format: string;
  topic: string;
  viralityScore: number;
  viewRange: string;
  videoCount: number;
  trendClassification: string;
  label: string | null;
}

interface FormatStat {
  format: string;
  label: string;
  count: number;
  percentage: number;
  avgVirality: number;
  topScore: number;
}

interface TrendingHook {
  hook: string;
  hookType: string | null;
  topic: string | null;
  platform: string | null;
  viralityScore: number;
  views: number | null;
}

export default function OpportunitiesPage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const { data: topOpps, isLoading: loadingTop } = useQuery<Opportunity[]>({
    queryKey: [selectedFormat ? `/api/opportunities/top?format=${selectedFormat}` : "/api/opportunities/top"],
  });

  const { data: emerging, isLoading: loadingEmerging } = useQuery<EmergingOpp[]>({
    queryKey: ["/api/opportunities/emerging"],
  });

  const { data: formats } = useQuery<FormatStat[]>({
    queryKey: ["/api/opportunities/trending-formats"],
  });

  const { data: hooks } = useQuery<TrendingHook[]>({
    queryKey: ["/api/opportunities/trending-hooks"],
  });

  const handleSave = async (opp: Opportunity | EmergingOpp) => {
    try {
      await apiRequest("POST", "/api/ideas/save", {
        hook: opp.hook,
        format: opp.format,
        topic: opp.topic,
        opportunityScore: opp.viralityScore,
      });
      setSavedIds((prev) => new Set(prev).add(opp.id));
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({ title: t.opportunities.savedIdea });
    } catch {}
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8" data-testid="page-opportunities">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.opportunities.title}</h1>
          <p className="text-sm text-muted-foreground">{t.opportunities.subtitle}</p>
        </div>

        {formats && formats.length > 0 && (
          <div className="space-y-3" data-testid="section-trending-formats">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-blue-500" />
                {t.opportunities.trendingFormats}
              </h2>
              <p className="text-sm text-muted-foreground">{t.opportunities.trendingFormatsDesc}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedFormat === null ? "default" : "outline"}
                className="text-xs"
                onClick={() => setSelectedFormat(null)}
                data-testid="button-filter-all"
              >
                {t.opportunities.allFormats}
              </Button>
              {formats.map((f) => (
                <Button
                  key={f.format}
                  size="sm"
                  variant={selectedFormat === f.format ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => setSelectedFormat(f.format === selectedFormat ? null : f.format)}
                  data-testid={`button-filter-${f.format}`}
                >
                  {f.label} ({f.percentage}%)
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4" data-testid="section-top-opportunities">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              {t.opportunities.topOpportunitiesToday}
            </h2>
            <p className="text-sm text-muted-foreground">{t.opportunities.topOpportunitiesDesc}</p>
          </div>

          {loadingTop ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : !topOpps || topOpps.length === 0 ? (
            <Card className="border border-border/50">
              <CardContent className="p-8 text-center">
                <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold">{t.opportunities.noOpportunities}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t.opportunities.noOpportunitiesDesc}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topOpps.map((opp) => (
                <Card key={opp.id} className="border border-border/50 hover:border-border transition-colors" data-testid={`card-top-opp-${opp.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className={`text-[10px] ${getViralityBadge(opp.viralityScore)}`}>
                        {opp.viralityScore}
                      </Badge>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[10px]">{opp.platform}</Badge>
                        <Badge variant="outline" className="text-[10px]">{opp.format.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                    <p className="text-sm font-medium line-clamp-2" data-testid={`text-opp-hook-${opp.id}`}>"{opp.hook}"</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {opp.viewRange}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-muted">{opp.topic.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-violet-600 hover:bg-violet-700"
                        onClick={() => setLocation(`/create?hook=${encodeURIComponent(opp.hook)}&format=${encodeURIComponent(opp.format)}&topic=${encodeURIComponent(opp.topic)}`)}
                        data-testid={`button-create-opp-${opp.id}`}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {t.opportunities.createVideo}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleSave(opp)}
                        disabled={savedIds.has(opp.id)}
                        data-testid={`button-save-opp-${opp.id}`}
                      >
                        <BookmarkPlus className="h-3 w-3 mr-1" />
                        {savedIds.has(opp.id) ? t.opportunities.saved : t.opportunities.save}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {emerging && emerging.length > 0 && (
          <div className="space-y-4" data-testid="section-emerging">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                {t.opportunities.emergingOpportunities}
              </h2>
              <p className="text-sm text-muted-foreground">{t.opportunities.emergingDesc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emerging.map((opp) => (
                <Card key={opp.id} className="border border-green-500/20 bg-green-500/5 hover:border-green-500/40 transition-colors" data-testid={`card-emerging-${opp.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {t.opportunities.emergingBadge}
                      </Badge>
                      <Badge className={`text-[10px] ${getViralityBadge(opp.viralityScore)}`}>
                        {opp.viralityScore}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-2">"{opp.hook}"</p>
                    <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-full bg-muted">{opp.format.replace(/_/g, " ")}</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted">{opp.topic.replace(/_/g, " ")}</span>
                      <span>{opp.videoCount} {t.opportunities.videos}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => setLocation(`/create?hook=${encodeURIComponent(opp.hook)}&format=${encodeURIComponent(opp.format)}&topic=${encodeURIComponent(opp.topic)}`)}
                        data-testid={`button-create-emerging-${opp.id}`}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {t.opportunities.createVideo}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleSave(opp)}
                        disabled={savedIds.has(opp.id)}
                        data-testid={`button-save-emerging-${opp.id}`}
                      >
                        <BookmarkPlus className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {hooks && hooks.length > 0 && (
          <div className="space-y-4" data-testid="section-trending-hooks">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                {t.opportunities.trendingHooks}
              </h2>
              <p className="text-sm text-muted-foreground">{t.opportunities.trendingHooksDesc}</p>
            </div>
            <div className="space-y-2">
              {hooks.slice(0, 10).map((hook, i) => (
                <Card
                  key={i}
                  className="border border-border/50 cursor-pointer hover:border-border transition-colors"
                  onClick={() => setLocation(`/create?hook=${encodeURIComponent(hook.hook || "")}`)}
                  data-testid={`card-trending-hook-${i}`}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                      <p className="text-sm truncate flex-1">{hook.hook}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {hook.hookType && (
                        <Badge variant="outline" className="text-[10px]">{hook.hookType.replace(/_/g, " ")}</Badge>
                      )}
                      {hook.platform && (
                        <Badge variant="outline" className="text-[10px]">{hook.platform}</Badge>
                      )}
                      <span className={`text-sm font-bold ${getViralityColor(hook.viralityScore)}`}>
                        {hook.viralityScore}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
