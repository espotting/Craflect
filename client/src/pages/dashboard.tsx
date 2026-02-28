import { DashboardLayout } from "@/components/layout";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspaces";
import { useSources, useGeneratedContent } from "@/hooks/use-sources";
import { useBriefs } from "@/hooks/use-briefs";
import { useSubscription } from "@/hooks/use-subscription";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderKanban, ArrowRight, Loader2, Sparkles, Wand2, TrendingUp, Brain, CreditCard, Zap, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

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

  let insightTags: string[] = [];
  if (latestInsight) {
    try {
      const insightsJson = typeof latestInsight.insights === "string" ? JSON.parse(latestInsight.insights) : latestInsight.insights;
      if (insightsJson?.contentAngles) {
        insightTags = insightsJson.contentAngles.slice(0, 2).map((a: any) => typeof a === "string" ? a : (a.angle || a.name || ""));
      }
      if (latestInsight.format && insightTags.length < 3) {
        insightTags.push(latestInsight.format.replace(/_/g, " "));
      }
    } catch {}
  }

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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">

        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground" data-testid="text-ai-learning">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
          {t.dashboard.aiLearning}
        </div>

        {latestInsight ? (
          <Card className="border-primary/20 bg-card overflow-hidden relative" data-testid="card-latest-insight">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 dark:bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <CardContent className="p-6 relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t.dashboard.latestInsight}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-foreground leading-snug line-clamp-2" data-testid="text-insight-topic">
                {latestInsight.topic}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-2" data-testid="text-insight-hook">
                {latestInsight.hook}
              </p>
              {insightTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {insightTags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] capitalize" data-testid={`badge-insight-tag-${i}`}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <Button onClick={() => setLocation("/briefs")} className="bg-primary hover:bg-primary/90 text-white rounded-lg h-10 px-6 text-sm font-medium" data-testid="button-view-insight">
                  {t.dashboard.viewInsight}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button onClick={() => setLocation("/briefs")} variant="outline" className="rounded-lg h-10 px-5 text-sm" data-testid="button-generate-content">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {t.dashboard.generateContent}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border border-dashed border-2" data-testid="card-no-insight">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <h3 className="font-display text-lg font-bold text-foreground mb-1">{t.dashboard.noInsightsTitle}</h3>
              <p className="text-sm text-muted-foreground mb-5">{t.dashboard.noInsightsDesc}</p>
              <Button onClick={() => setLocation(hasSources ? "/briefs" : "/library")} className="rounded-lg" data-testid="button-go-insights">
                {hasSources ? t.dashboard.generateFirstBrief : t.dashboard.generateFirstAnalysis}
              </Button>
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
