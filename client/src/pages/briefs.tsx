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
import type { Brief } from "@shared/schema";
import {
  Sparkles,
  History,
  Loader2,
  ArrowRight,
  TrendingUp,
  Target,
  Lightbulb,
  BarChart3,
  Zap,
  FileText,
  ChevronDown,
  ChevronUp,
  Star,
  Play,
  AlertCircle,
} from "lucide-react";

interface InsightHook {
  type: string;
  score: number;
  description: string;
}

interface WinningFormat {
  format: string;
  percentage: number;
  description: string;
}

interface ContentAngle {
  angle: string;
  performance: number | string;
  description: string;
}

interface NichePattern {
  pattern: string;
  frequency: number | string;
  impact: string;
}

interface Recommendation {
  action: string;
  reason: string;
  priority: string;
}

function parseInsights(insightsStr: string | null) {
  if (!insightsStr) return null;
  try {
    const parsed = JSON.parse(insightsStr);
    return parsed as {
      topHooks?: InsightHook[];
      winningFormats?: WinningFormat[];
      contentAngles?: ContentAngle[];
      nichePatterns?: NichePattern[];
    };
  } catch {
    return null;
  }
}

function parseRecommendations(recStr: string | null): Recommendation[] {
  if (!recStr) return [];
  try {
    const parsed = JSON.parse(recStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ScoreBadge({ score }: { score: number }) {
  let colorClass = "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5";
  if (score >= 80) colorClass = "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/5";
  else if (score >= 60) colorClass = "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5";
  else if (score >= 40) colorClass = "border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/5";
  return (
    <Badge variant="outline" className={`rounded-full text-[10px] uppercase font-bold ${colorClass}`}>
      {score}/100
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5",
    medium: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5",
    low: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/5",
  };
  return (
    <Badge variant="outline" className={`rounded-full text-[10px] uppercase font-bold ${styles[priority.toLowerCase()] || styles.medium}`}>
      {priority}
    </Badge>
  );
}

function InsightSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

function TopHooksSection({ hooks }: { hooks: InsightHook[] }) {
  if (!hooks || hooks.length === 0) return null;
  const sorted = [...hooks].sort((a, b) => (b.score || 0) - (a.score || 0));
  return (
    <Card className="border-border" data-testid="card-top-hooks">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Target className="w-4 h-4 text-primary" />
          Top Performing Hooks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((hook, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border" data-testid={`hook-item-${i}`}>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground capitalize">{hook.type?.replace(/_/g, " ")}</span>
                {typeof hook.score === "number" && <ScoreBadge score={hook.score} />}
              </div>
              <p className="text-xs text-muted-foreground">{hook.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WinningFormatsSection({ formats }: { formats: WinningFormat[] }) {
  if (!formats || formats.length === 0) return null;
  return (
    <Card className="border-border" data-testid="card-winning-formats">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Play className="w-4 h-4 text-primary" />
          Winning Formats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {formats.map((fmt, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border" data-testid={`format-item-${i}`}>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground capitalize">{fmt.format?.replace(/_/g, " ")}</span>
                {typeof fmt.percentage === "number" && (
                  <Badge variant="secondary" className="text-[10px]">{fmt.percentage}%</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{fmt.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ContentAnglesSection({ angles }: { angles: ContentAngle[] }) {
  if (!angles || angles.length === 0) return null;
  return (
    <Card className="border-border" data-testid="card-content-angles">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Lightbulb className="w-4 h-4 text-primary" />
          Content Angles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {angles.map((angle, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border" data-testid={`angle-item-${i}`}>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground capitalize">{angle.angle?.replace(/_/g, " ")}</span>
                {angle.performance && (
                  <Badge variant="secondary" className="text-[10px]">
                    {typeof angle.performance === "number" ? `${angle.performance}/100` : angle.performance}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{angle.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function NichePatternsSection({ patterns }: { patterns: NichePattern[] }) {
  if (!patterns || patterns.length === 0) return null;
  return (
    <Card className="border-border" data-testid="card-niche-patterns">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <BarChart3 className="w-4 h-4 text-primary" />
          Niche Patterns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {patterns.map((pat, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border" data-testid={`pattern-item-${i}`}>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{pat.pattern}</span>
                {pat.frequency && (
                  <Badge variant="secondary" className="text-[10px]">
                    {typeof pat.frequency === "number" ? `${pat.frequency}x` : pat.frequency}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{pat.impact}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecommendationsSection({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations || recommendations.length === 0) return null;
  return (
    <Card className="border-border" data-testid="card-recommendations">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <AlertCircle className="w-4 h-4 text-primary" />
          Actionable Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="p-3 rounded-md bg-background/50 border border-border space-y-2" data-testid={`recommendation-item-${i}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{rec.action}</span>
              <PriorityBadge priority={rec.priority} />
            </div>
            <p className="text-xs text-muted-foreground">{rec.reason}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InsightReportCard({ brief, workspaceId, isLatest }: { brief: Brief; workspaceId: string; isLatest: boolean }) {
  const { toast } = useToast();
  const generateFromBrief = useGenerateFromBrief();
  const [expanded, setExpanded] = useState(isLatest);

  const insights = parseInsights(brief.insights);
  const recommendations = parseRecommendations(brief.recommendations);

  const handleGenerate = () => {
    generateFromBrief.mutate(
      { briefId: brief.id, workspaceId },
      {
        onSuccess: (data) => {
          toast({
            title: "Content generated",
            description: `${data.length} content piece(s) created from these insights.`,
          });
        },
        onError: (err) => {
          toast({
            title: "Generation failed",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const createdDate = new Date(brief.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4" data-testid={`card-insight-${brief.id}`}>
      <Card className={`border-border ${isLatest ? "border-primary/20 relative" : ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {isLatest && (
                <Badge variant="outline" className="rounded-full text-[10px] uppercase font-bold border-primary/50 text-primary bg-primary/5">
                  Latest
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full text-[10px] uppercase font-bold border-muted-foreground/50 text-muted-foreground">
                {brief.format}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isLatest && <Zap className="w-3 h-3 text-yellow-500" />}
              {createdDate}
            </div>
          </div>
          <CardTitle className="text-xl font-display text-foreground mt-3" data-testid={`text-insight-topic-${brief.id}`}>
            {brief.topic}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1 italic" data-testid={`text-insight-hook-${brief.id}`}>
            {brief.hook}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-semibold text-primary"
            data-testid={`button-toggle-details-${brief.id}`}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide detailed analysis" : "Show detailed analysis"}
          </button>

          {expanded && (
            <div className="space-y-3">
              <div className="p-4 rounded-md bg-background/50 border border-border">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Analysis</h4>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line" data-testid={`text-insight-analysis-${brief.id}`}>
                  {brief.script}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Button
              onClick={handleGenerate}
              disabled={generateFromBrief.isPending}
              data-testid={`button-generate-from-insight-${brief.id}`}
            >
              {generateFromBrief.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {generateFromBrief.isPending ? "Generating..." : "Generate recommended content"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {expanded && insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.topHooks && insights.topHooks.length > 0 && (
            <TopHooksSection hooks={insights.topHooks} />
          )}
          {insights.winningFormats && insights.winningFormats.length > 0 && (
            <WinningFormatsSection formats={insights.winningFormats} />
          )}
          {insights.contentAngles && insights.contentAngles.length > 0 && (
            <ContentAnglesSection angles={insights.contentAngles} />
          )}
          {insights.nichePatterns && insights.nichePatterns.length > 0 && (
            <NichePatternsSection patterns={insights.nichePatterns} />
          )}
        </div>
      )}

      {expanded && recommendations.length > 0 && (
        <RecommendationsSection recommendations={recommendations} />
      )}
    </div>
  );
}

export default function Briefs() {
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const selectedWorkspace = workspaces?.[0];
  const workspaceId = selectedWorkspace?.id;

  const { data: briefs, isLoading: briefsLoading } = useBriefs(workspaceId);
  const generateBrief = useGenerateBrief(workspaceId);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showHistory, setShowHistory] = useState(false);

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
        toast({
          title: "Insights generated",
          description: "Your performance insights are ready.",
        });
      },
      onError: (err) => {
        toast({
          title: "Generation failed",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  const isLoading = workspacesLoading || briefsLoading;
  const sortedBriefs = briefs ? [...briefs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
  const latestBrief = sortedBriefs[0];
  const historyBriefs = sortedBriefs.slice(1);

  if (!workspacesLoading && !selectedWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-20 rounded-md border-dashed border-2 border-border text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <TrendingUp className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground mb-2" data-testid="text-no-workspace">No workspace yet</h3>
          <p className="text-muted-foreground max-w-md mb-8">Create a workspace first to start generating performance insights.</p>
          <Button onClick={() => navigate("/")} data-testid="button-go-dashboard">
            Go to Dashboard
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
            <h1 className="font-display text-4xl font-bold text-foreground mb-2" data-testid="text-page-title">Insights</h1>
            <p className="text-muted-foreground">Performance patterns and actionable recommendations from your content library.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {historyBriefs.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                data-testid="button-history"
              >
                <History className="w-4 h-4 mr-2" />
                {showHistory ? "Hide History" : `History (${historyBriefs.length})`}
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
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              {generateBrief.isPending ? "Analyzing..." : "Generate Insights"}
            </Button>
          </div>
        </div>

        {isLoading || generateBrief.isPending ? (
          <InsightSkeleton />
        ) : latestBrief ? (
          <div className="space-y-8">
            <InsightReportCard brief={latestBrief} workspaceId={workspaceId!} isLatest />

            <div className="flex flex-col items-center justify-center p-8 rounded-md border-dashed border-2 border-border text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2" data-testid="text-generate-cta">Want fresh insights?</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-4">Add more content to your library and generate new insights to discover updated patterns.</p>
              <div className="flex gap-3 flex-wrap justify-center">
                <Button
                  variant="outline"
                  onClick={handleGenerateInsights}
                  disabled={generateBrief.isPending}
                  data-testid="button-generate-another"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Regenerate Insights
                </Button>
                <Button variant="outline" onClick={() => navigate("/library")} data-testid="link-go-to-library">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Add Content
                </Button>
              </div>
            </div>

            {showHistory && historyBriefs.length > 0 && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-bold text-foreground" data-testid="text-history-title">Past Insight Reports</h2>
                {historyBriefs.map((brief) => (
                  <InsightReportCard key={brief.id} brief={brief} workspaceId={workspaceId!} isLatest={false} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2" data-testid="text-empty-state">No insights yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Generate your first insights report to discover performance patterns in your content library. Add and analyze content first for the best results.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button
                onClick={handleGenerateInsights}
                disabled={generateBrief.isPending}
                data-testid="button-first-insights"
              >
                {generateBrief.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                Generate First Insights
              </Button>
              <Button variant="outline" onClick={() => navigate("/library")} data-testid="link-go-to-library">
                <ArrowRight className="w-4 h-4 mr-2" />
                Go to Library
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
