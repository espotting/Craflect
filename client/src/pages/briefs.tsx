import { DashboardLayout } from "@/components/layout";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useBriefs, useGenerateBrief, useGenerateFromBrief } from "@/hooks/use-briefs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Brief } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import {
  Brain,
  Sparkles,
  Target,
  Zap,
  ArrowRight,
  ChevronDown,
  Wand2,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface SnapshotScoring {
  totalVideos: number;
  confidencePercent: number;
  signalStrengthPercent: number;
  intelligenceStatus: string;
  dominantHook: string | null;
  dominantStructure: string | null;
  dominantFormat: string | null;
  dominantAngle: string | null;
  topHooks: { name: string; pct: number }[];
  topFormats: { name: string; pct: number }[];
  topAngles: { name: string; pct: number }[];
}

interface NicheSnapshot {
  niche: { id: string; name: string; description: string };
  scoring: SnapshotScoring;
  recommendation: {
    intelligenceSummary: string | null;
    strategicRecommendation: string | null;
    nicheShiftSignal: string | null;
  } | null;
  distributions: Record<string, unknown> | null;
}

function parseInsights(insightsStr: string | null) {
  if (!insightsStr) return null;
  try {
    return JSON.parse(insightsStr) as {
      topHooks?: { type: string; score: number }[];
      winningFormats?: { format: string; percentage: number }[];
      contentAngles?: { angle: string; performance: number | string }[];
    };
  } catch {
    return null;
  }
}

function parseRecommendations(recStr: string | null): { action: string }[] {
  if (!recStr) return [];
  try {
    const parsed = JSON.parse(recStr);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function InsightSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

function NicheProfileCard({ scoring }: { scoring: SnapshotScoring }) {
  const { t } = useLanguage();

  return (
    <Card data-testid="card-niche-profile">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-bold flex-wrap">
          <Brain className="w-4 h-4 text-primary" />
          {t.insights.nicheProfile}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1" data-testid="text-sample-size">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.insights.sampleSize}</p>
            <p className="text-lg font-bold text-foreground">{scoring.totalVideos}</p>
          </div>
          <div className="space-y-1" data-testid="text-dominant-hook">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.insights.topHooks}</p>
            <p className="text-sm font-semibold text-foreground capitalize">{scoring.dominantHook?.replace(/_/g, " ") || "—"}</p>
          </div>
          <div className="space-y-1" data-testid="text-dominant-format">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.insights.winningFormats}</p>
            <p className="text-sm font-semibold text-foreground capitalize">{scoring.dominantFormat?.replace(/_/g, " ") || "—"}</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="space-y-1" data-testid="text-confidence">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Confidence</p>
              <Badge variant="outline" className="text-xs">{scoring.confidencePercent}%</Badge>
            </div>
            <div className="space-y-1" data-testid="text-maturity">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.insights.maturity}</p>
              <Badge variant="secondary" className="text-xs">{scoring.intelligenceStatus}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PatternCard({
  title,
  icon: Icon,
  items,
  testId,
}: {
  title: string;
  icon: React.ElementType;
  items: { name: string; pct: number }[];
  testId: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-bold flex-wrap">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2" data-testid={`${testId}-item-${i}`}>
            <span className="text-sm text-foreground capitalize">{item.name.replace(/_/g, " ")}</span>
            <Badge variant="outline" className="text-xs">{item.pct}%</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Briefs() {
  const { t } = useLanguage();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const selectedWorkspace = workspaces?.[0];
  const workspaceId = selectedWorkspace?.id;
  const nicheId = selectedWorkspace?.nicheId;

  const { data: briefs, isLoading: briefsLoading } = useBriefs(workspaceId);
  const generateBrief = useGenerateBrief(workspaceId);
  const generateFromBrief = useGenerateFromBrief();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showHistory, setShowHistory] = useState(false);

  const { data: snapshot } = useQuery<NicheSnapshot>({
    queryKey: ["/api/niches", nicheId, "snapshot"],
    enabled: !!nicheId,
  });

  const scoring = snapshot?.scoring;

  const handleGenerateInsights = () => {
    if (!workspaceId) {
      toast({
        title: "No workspace",
        description: "Create a workspace first to generate insights.",
        variant: "destructive",
      });
      return;
    }
    generateBrief.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Insights generated", description: "Your performance insights are ready." });
      },
      onError: (err) => {
        toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleGenerateContent = (brief: Brief) => {
    generateFromBrief.mutate(
      { briefId: brief.id, workspaceId: workspaceId! },
      {
        onSuccess: (data) => {
          toast({ title: "Content generated", description: `${data.length} content piece(s) created.` });
        },
        onError: (err) => {
          toast({ title: "Generation failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const isLoading = workspacesLoading || briefsLoading;
  const sortedBriefs = briefs ? [...briefs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
  const latestBrief = sortedBriefs[0];
  const historyBriefs = sortedBriefs.slice(1);

  const latestInsights = latestBrief ? parseInsights(latestBrief.insights) : null;
  const latestRecommendations = latestBrief ? parseRecommendations(latestBrief.recommendations) : [];

  const topHooksData: { name: string; pct: number }[] =
    latestInsights?.topHooks?.map((h) => ({ name: h.type, pct: h.score })) ||
    scoring?.topHooks ||
    [];

  const winningFormatsData: { name: string; pct: number }[] =
    latestInsights?.winningFormats?.map((f) => ({ name: f.format, pct: f.percentage })) ||
    scoring?.topFormats ||
    [];

  const topAnglesData: { name: string; pct: number }[] =
    latestInsights?.contentAngles?.map((a) => ({
      name: a.angle,
      pct: typeof a.performance === "number" ? a.performance : 0,
    })) ||
    scoring?.topAngles ||
    [];

  const hasData = !!latestBrief || (scoring && scoring.totalVideos > 0);

  const headerTitle = hasData
    ? (latestBrief ? t.insights.signalClear : t.insights.whatWins)
    : t.insights.noSignalYet;

  if (!workspacesLoading && !selectedWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-20 rounded-md border-dashed border-2 border-border text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Brain className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground mb-2" data-testid="text-no-workspace">{t.insights.noWorkspaceTitle}</h3>
          <p className="text-muted-foreground max-w-md mb-8">{t.insights.noWorkspaceDesc}</p>
          <Button onClick={() => navigate("/")} data-testid="button-go-dashboard">
            {t.insights.goToDashboard}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-1" data-testid="text-page-title">{t.insights.title}</h1>
            <p className="text-muted-foreground" data-testid="text-page-subtitle">{headerTitle}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {historyBriefs.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                data-testid="button-history"
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                {showHistory ? t.insights.hideHistory : `${t.insights.history} (${historyBriefs.length})`}
              </Button>
            )}
            <Button
              onClick={handleGenerateInsights}
              disabled={generateBrief.isPending}
              data-testid="button-generate-insights"
            >
              {generateBrief.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {generateBrief.isPending ? t.insights.analyzing : t.insights.generateInsights}
            </Button>
          </div>
        </div>

        {isLoading || generateBrief.isPending ? (
          <InsightSkeleton />
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <Brain className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2" data-testid="text-empty-state">{t.insights.noInsightsTitle}</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">{t.insights.noInsightsDesc}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button
                onClick={handleGenerateInsights}
                disabled={generateBrief.isPending}
                data-testid="button-first-insights"
              >
                {generateBrief.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                {t.insights.generateFirst}
              </Button>
              <Button variant="outline" onClick={() => navigate("/library")} data-testid="link-go-to-library">
                <ArrowRight className="w-4 h-4 mr-2" />
                {t.insights.goToLibrary}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {scoring && <NicheProfileCard scoring={scoring} />}

            {latestBrief && (
              <div className="flex items-center gap-3 flex-wrap" data-testid="card-latest-brief">
                <Badge variant="outline" className="text-xs">{t.insights.latest}</Badge>
                <span className="text-sm font-semibold text-foreground" data-testid="text-latest-topic">{latestBrief.topic}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(latestBrief.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            )}

            <div>
              <h2 className="font-display text-xl font-bold text-foreground mb-4" data-testid="text-winning-patterns">
                <Sparkles className="w-5 h-5 text-primary inline mr-2" />
                {t.insights.winningPatterns}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PatternCard
                  title={t.insights.topHooks}
                  icon={Target}
                  items={topHooksData}
                  testId="card-top-hooks"
                />
                <PatternCard
                  title={t.insights.winningFormats}
                  icon={Zap}
                  items={winningFormatsData}
                  testId="card-winning-formats"
                />
                <PatternCard
                  title={t.insights.topAngles}
                  icon={Brain}
                  items={topAnglesData}
                  testId="card-top-angles"
                />
              </div>
            </div>

            {latestRecommendations.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-bold text-foreground mb-4" data-testid="text-what-to-do-next">
                  <Wand2 className="w-5 h-5 text-primary inline mr-2" />
                  {t.insights.whatToDoNext}
                </h2>
                <Card data-testid="card-recommendations">
                  <CardContent className="pt-6 space-y-3">
                    {latestRecommendations.map((rec, i) => (
                      <div key={i} className="flex items-center gap-3" data-testid={`recommendation-item-${i}`}>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm text-foreground">{rec.action}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => navigate("/niche-data")}
                data-testid="button-view-data"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {t.insights.viewDataBehind}
              </Button>
              {latestBrief && (
                <Button
                  onClick={() => handleGenerateContent(latestBrief)}
                  disabled={generateFromBrief.isPending}
                  data-testid="button-generate-recommended"
                >
                  {generateFromBrief.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {generateFromBrief.isPending ? t.insights.generating : t.insights.generateRecommended}
                </Button>
              )}
            </div>

            {showHistory && historyBriefs.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold text-foreground" data-testid="text-history-title">{t.insights.pastReports}</h2>
                {historyBriefs.map((brief) => {
                  const date = new Date(brief.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <Card key={brief.id} data-testid={`card-history-${brief.id}`}>
                      <CardContent className="flex items-center justify-between gap-4 py-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-semibold text-foreground" data-testid={`text-history-topic-${brief.id}`}>{brief.topic}</span>
                          <span className="text-xs text-muted-foreground">{date}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateContent(brief)}
                          disabled={generateFromBrief.isPending}
                          data-testid={`button-generate-from-${brief.id}`}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          {t.insights.generateRecommended}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
