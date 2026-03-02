import { DashboardLayout } from "@/components/layout";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspaces";
import { useSources, useGeneratedContent } from "@/hooks/use-sources";
import { useBriefs } from "@/hooks/use-briefs";
import { useSubscription } from "@/hooks/use-subscription";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderKanban, ArrowRight, Loader2, Sparkles, Wand2, TrendingUp, Brain, CreditCard, Zap, AlertTriangle, ChevronDown, Target, BarChart3, Clock, Shield, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

function DistributionBar({ data, label }: { data: Record<string, number> | null; label: string }) {
  if (!data) return null;
  const sorted = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  const colors = ["bg-primary", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500"];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="space-y-1.5">
        {sorted.slice(0, 5).map(([key, value], i) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-28 truncate" title={key.replace(/_/g, " ")}>{key.replace(/_/g, " ")}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${Math.round(value * 100)}%` }} />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{Math.round(value * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreGauge({ value, label, size = "normal" }: { value: number | null; label: string; size?: "normal" | "large" }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-rose-500";
  const bgColor = pct >= 70 ? "bg-emerald-500/10" : pct >= 40 ? "bg-amber-500/10" : "bg-rose-500/10";
  return (
    <div className={`flex flex-col items-center gap-1 p-3 rounded-xl ${bgColor}`}>
      <span className={`font-bold font-mono ${color} ${size === "large" ? "text-2xl" : "text-lg"}`}>{pct}%</span>
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createMutation = useCreateWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const selectedWorkspace = workspaces?.[0];
  const { data: sources } = useSources(selectedWorkspace?.id);
  const { data: generatedContent } = useGeneratedContent(selectedWorkspace?.id);
  const { data: briefs } = useBriefs(selectedWorkspace?.id);
  const { data: subscription } = useSubscription();

  const { data: availableNiches } = useQuery<any[]>({
    queryKey: ["/api/niches/available"],
  });

  const [selectedNicheId, setSelectedNicheId] = useState<string | null>(null);

  const activeNicheId = selectedNicheId || availableNiches?.[0]?.id;

  const { data: snapshotData } = useQuery<any>({
    queryKey: ["/api/niches", activeNicheId, "snapshot"],
    enabled: !!activeNicheId,
  });

  const latestInsight = briefs?.[0];
  const latestContent = generatedContent?.slice(0, 3);

  const hasWorkspace = (workspaces?.length || 0) > 0;
  const hasSources = (sources?.length || 0) > 0;
  const analyzedSources = sources?.filter((s: any) => s.ingestionStatus === "analyzed") || [];
  const hasAnalyzed = analyzedSources.length > 0;
  const hasInsights = (briefs?.length || 0) > 0;
  const hasContent = (generatedContent?.length || 0) > 0;

  const analysesUsed = subscription?.analysesUsed ?? 0;
  const analysesLimit = subscription?.analysesLimit ?? 20;
  const nichesCount = subscription?.nichesCount ?? 0;
  const nichesLimit = subscription?.nichesLimit ?? 1;
  const analysesPercent = analysesLimit > 0 ? Math.round((analysesUsed / analysesLimit) * 100) : 0;
  const nichesPercent = nichesLimit > 0 ? Math.round((nichesCount / nichesLimit) * 100) : 0;
  const isTrialing = subscription?.billingStatus === "trial";
  const planName = subscription?.plan || "starter";
  const showUpgradeWarning = analysesPercent >= 70 || nichesPercent >= 100;

  const renewalDays = subscription?.renewalDate
    ? Math.max(0, Math.ceil((new Date(subscription.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const getNextAction = () => {
    if (!hasWorkspace) return { label: t.dashboard.actions.createWorkspace, action: () => setIsOpen(true), cta: t.common.continue };
    if (!hasSources) return { label: t.dashboard.actions.addUrls, action: () => setLocation("/library"), cta: t.common.continue };
    if (!hasAnalyzed) return { label: t.dashboard.actions.runAnalysis, action: () => setLocation("/library"), cta: t.common.continue };
    if (!hasInsights) return { label: t.dashboard.actions.generateBrief, action: () => setLocation("/briefs"), cta: t.common.continue };
    if (!hasContent) return { label: t.dashboard.actions.createContent, action: () => setLocation("/briefs"), cta: t.common.continue };
    return { label: t.dashboard.actions.addMore, action: () => setLocation("/library"), cta: t.common.continue };
  };

  const nextAction = getNextAction();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({ name });
      setIsOpen(false);
      setName("");
      toast({ title: t.dashboard.createWorkspace, description: t.dashboard.workspaceDesc });
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    }
  };

  const createDialog = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 neon-border h-11 px-6" data-testid="button-new-workspace">
          <Plus className="w-5 h-5 mr-2" />
          {t.dashboard.newWorkspace}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t.dashboard.createWorkspace}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t.dashboard.workspaceDesc}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">{t.dashboard.workspaceName}</label>
            <Input
              placeholder="e.g. Acme Corp Marketing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary focus-visible:border-primary"
              autoFocus
              data-testid="input-workspace-name"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 font-medium text-white"
            disabled={createMutation.isPending || !name.trim()}
            data-testid="button-create-workspace"
          >
            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t.dashboard.createWorkspace}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (workspaces?.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-20 glass-card rounded-3xl border-dashed border-2 border-border text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <FolderKanban className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground mb-2">{t.dashboard.noWorkspacesTitle}</h3>
          <p className="text-muted-foreground max-w-md mb-8">{t.dashboard.noWorkspacesDesc}</p>
          {createDialog}
        </div>
      </DashboardLayout>
    );
  }

  const snapshot = snapshotData?.snapshot;
  const recommendation = snapshotData?.recommendation;
  const distributions = snapshotData?.distributions;
  const selectedNiche = availableNiches?.find((n: any) => n.id === activeNicheId);

  const getSignalMessage = () => {
    if (recommendation?.nicheShiftSignal) return recommendation.nicheShiftSignal;
    if (snapshot?.patternStabilityScore >= 0.6) return t.dashboard.nicheStable;
    return null;
  };

  const signalMessage = getSignalMessage();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">

        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground" data-testid="text-ai-learning">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
          {t.dashboard.aiLearning}
        </div>

        {availableNiches && availableNiches.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">{t.dashboard.selectNiche}:</span>
            {availableNiches.map((n: any) => (
              <Button
                key={n.id}
                variant={n.id === activeNicheId ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs h-7 px-3"
                onClick={() => setSelectedNicheId(n.id)}
                data-testid={`button-niche-${n.id}`}
              >
                {n.name.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        )}

        {snapshot ? (
          <>
            <Card className="border-primary/20 bg-card overflow-hidden relative" data-testid="card-snapshot">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 dark:bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <CardContent className="p-6 relative z-10 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t.dashboard.snapshot}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] rounded-full" data-testid="badge-video-count">
                    {t.dashboard.basedOn.replace("{count}", String(snapshot.totalVideos || 0))}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SnapshotStat icon={Sparkles} label={t.dashboard.dominantHook} value={snapshot.dominantHook?.replace(/_/g, " ")} />
                  <SnapshotStat icon={Target} label={t.dashboard.dominantStructure} value={snapshot.dominantStructure?.replace(/_/g, " ")} />
                  <SnapshotStat icon={Clock} label={t.dashboard.idealDuration} value={snapshot.medianDuration ? `${Math.round(snapshot.medianDuration)}s` : "—"} />
                  <SnapshotStat icon={TrendingUp} label={t.dashboard.recommendedAngle} value={snapshot.dominantAngle?.replace(/_/g, " ")} />
                </div>

                <div className="flex items-center gap-4 justify-center pt-1">
                  <ScoreGauge value={snapshot.patternStabilityScore} label={t.dashboard.patternStability} />
                  <ScoreGauge value={snapshot.confidenceScore} label={t.dashboard.confidenceLevel} />
                </div>
              </CardContent>
            </Card>

            {recommendation?.strategicRecommendation && (
              <Card className="border-border" data-testid="card-what-to-post">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t.dashboard.whatToPostNext}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-recommendation">
                    {recommendation.strategicRecommendation}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                    <MiniStat label={t.dashboard.hookSuggestion} value={snapshot.dominantHook?.replace(/_/g, " ")} />
                    <MiniStat label={t.dashboard.structureTemplate} value={snapshot.dominantStructure?.replace(/_/g, " ")} />
                    <MiniStat label={t.dashboard.angle} value={snapshot.dominantAngle?.replace(/_/g, " ")} />
                    <MiniStat label={t.dashboard.duration} value={snapshot.medianDuration ? `~${Math.round(snapshot.medianDuration)}s` : "—"} />
                  </div>
                </CardContent>
              </Card>
            )}

            {signalMessage && (
              <Card className={`border-border ${snapshot.patternStabilityScore >= 0.6 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`} data-testid="card-niche-signal">
                <CardContent className="p-5 flex items-center gap-3">
                  <Activity className={`w-5 h-5 flex-shrink-0 ${snapshot.patternStabilityScore >= 0.6 ? "text-emerald-500" : "text-amber-500"}`} />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">{t.dashboard.nicheSignal}</span>
                    <p className="text-sm text-foreground" data-testid="text-niche-signal">{signalMessage}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {distributions && (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="w-full rounded-xl text-xs text-muted-foreground" data-testid="button-data-on-demand">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {t.dashboard.dataOnDemand}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[70vh]">
                  <DrawerHeader>
                    <DrawerTitle className="font-display">{t.dashboard.dataOnDemand}</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DistributionBar data={distributions.hookDistribution} label={t.intelligence?.hookDistribution || "Hook Distribution"} />
                      <DistributionBar data={distributions.structureDistribution} label={t.intelligence?.structureDistribution || "Structure Distribution"} />
                      <DistributionBar data={distributions.angleDistribution} label={t.intelligence?.angleDistribution || "Angle Distribution"} />
                      <DistributionBar data={distributions.formatDistribution} label={t.intelligence?.formatDistribution || "Format Distribution"} />
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            )}
          </>
        ) : selectedNiche && !selectedNiche.isReady ? (
          <Card className="border-border border-dashed border-2" data-testid="card-niche-not-ready">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <Brain className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <Badge variant="outline" className="mb-3 rounded-full">{t.dashboard.comingSoon}</Badge>
              <p className="text-sm text-muted-foreground">{t.dashboard.nicheNotReady}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border border-dashed border-2" data-testid="card-no-snapshot">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <Brain className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <h3 className="font-display text-lg font-bold text-foreground mb-1">{t.dashboard.noNicheSelected}</h3>
              <p className="text-sm text-muted-foreground">{t.dashboard.noWorkspacesDesc}</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/20 bg-primary/5 dark:bg-primary/5" data-testid="card-next-action">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-display font-bold text-foreground" data-testid="text-next-action-title">{t.dashboard.nextBestAction}</h3>
                <p className="text-xs text-muted-foreground truncate" data-testid="text-next-action">{nextAction.label}</p>
              </div>
            </div>
            <Button onClick={nextAction.action} className="bg-primary hover:bg-primary/90 text-white rounded-lg h-9 px-5 text-sm font-medium flex-shrink-0" data-testid="button-next-action">
              {nextAction.cta}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border" data-testid="card-plan-usage">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t.dashboard.planUsage}</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-md px-3" onClick={() => setLocation("/pricing")} data-testid="button-manage-plan">
                {t.dashboard.managePlan}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-display font-bold text-foreground capitalize" data-testid="text-plan-name">{planName}</span>
              {isTrialing && (
                <Badge className="bg-secondary/15 text-secondary border border-secondary/20 text-[10px] px-2 py-0.5 rounded-full" data-testid="badge-trial">
                  {t.dashboard.freeTrial}
                </Badge>
              )}
              {renewalDays !== null && (
                <span className="text-[11px] text-muted-foreground">
                  {t.dashboard.renewsIn.replace("{days}", String(renewalDays))}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">{t.dashboard.analyses}</span>
                  <span className="font-medium text-foreground" data-testid="text-analyses-usage">{analysesUsed} / {analysesLimit}</span>
                </div>
                <Progress value={analysesPercent} className={`h-2 ${analysesPercent >= 90 ? '[&>div]:bg-destructive' : analysesPercent >= 70 ? '[&>div]:bg-yellow-500' : ''}`} />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">{t.dashboard.niches}</span>
                  <span className="font-medium text-foreground" data-testid="text-niches-usage">{nichesCount} / {nichesLimit}</span>
                </div>
                <Progress value={nichesPercent} className={`h-2 ${nichesPercent >= 100 ? '[&>div]:bg-destructive' : ''}`} />
              </div>
            </div>

            {showUpgradeWarning && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-yellow-500/10 dark:bg-yellow-500/5 border border-yellow-500/20" data-testid="alert-upgrade">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium">
                    {t.dashboard.upgradeWarning}
                  </p>
                  <Button variant="link" className="h-auto p-0 text-xs text-primary mt-1" onClick={() => setLocation("/pricing")} data-testid="link-upgrade">
                    <Zap className="w-3 h-3 mr-1" />
                    {t.dashboard.upgradePlan}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/50 text-center">
              {t.dashboard.analysesMemory}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border" data-testid="card-progress">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t.dashboard.learningProgress}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 dark:bg-muted/20 text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-analyzed-count">{analyzedSources.length}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{t.dashboard.sourcesAnalyzed}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 dark:bg-muted/20 text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-insights-count">{briefs?.length || 0}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{t.dashboard.insightsGenerated}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 dark:bg-muted/20 text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-content-count">{generatedContent?.length || 0}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{t.dashboard.contentCreated}</div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/60 mt-3 text-center">
              {t.dashboard.aiSmarter}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border" data-testid="card-latest-content">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-display text-foreground flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              {t.dashboard.latestGenerated}
            </CardTitle>
            {hasContent && (
              <Button variant="link" className="text-primary hover:text-primary/80 text-xs h-auto p-0" onClick={() => setLocation("/library")} data-testid="link-view-all-content">
                {t.common.viewAll}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {latestContent && latestContent.length > 0 ? (
              <div className="space-y-2.5">
                {latestContent.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 dark:bg-muted/15 hover:bg-muted/50 transition-colors" data-testid={`card-content-${item.id}`}>
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wand2 className="w-4 h-4 text-primary/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-1">{item.content.substring(0, 80)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="rounded-full text-[9px] px-1.5 py-0">{item.format}</Badge>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">{item.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">{t.dashboard.noContentYet}</p>
                <Button onClick={() => setLocation("/briefs")} variant="outline" className="rounded-lg text-sm" data-testid="button-generate-first-content">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {t.dashboard.generateFirstContent}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}

function SnapshotStat({ icon: Icon, label, value }: { icon: any; label: string; value: string | undefined }) {
  return (
    <div className="p-3 rounded-xl bg-muted/40 dark:bg-muted/20 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold font-display text-foreground capitalize" data-testid={`text-snapshot-${label.toLowerCase().replace(/\s/g, "-")}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30 dark:bg-muted/15">
      <span className="text-[10px] text-muted-foreground block">{label}</span>
      <span className="text-xs font-medium text-foreground capitalize">{value || "—"}</span>
    </div>
  );
}
