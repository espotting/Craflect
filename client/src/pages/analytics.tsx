import { DashboardLayout } from "@/components/layout";
import { TrendingUp, Users, Eye, Trophy, ArrowRight, Upload, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useWorkspaceAnalytics } from "@/hooks/use-analytics";
import { useTrackEvent } from "@/hooks/use-events";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";

export default function Analytics() {
  const { data: workspaces } = useWorkspaces();
  const selectedWorkspace = workspaces?.[0];
  const { data: analytics, isLoading } = useWorkspaceAnalytics(selectedWorkspace?.id);
  const trackEvent = useTrackEvent();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const { data: generatedContent } = useQuery({
    queryKey: ["/api/workspaces", selectedWorkspace?.id, "generated"],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${selectedWorkspace!.id}/generated`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedWorkspace?.id,
  });

  useEffect(() => {
    if (selectedWorkspace) {
      trackEvent.mutate({ eventName: "analytics_viewed", metadata: { workspaceId: selectedWorkspace.id } });
    }
  }, [selectedWorkspace?.id]);

  const hasData = analytics && (analytics.totalViews > 0 || analytics.sourceCount > 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-2" data-testid="text-analytics-title">{t.analytics.title}</h1>
          <p className="text-muted-foreground">{t.analytics.subtitle}</p>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted border border-border text-xs text-muted-foreground" data-testid="text-ai-analytics-learning">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          {t.analytics.aiLearning}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <Card key={i} className="glass-card border-border">
                <CardContent className="pt-6 space-y-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (
            [
              { label: t.analytics.totalViews, value: analytics?.totalViews?.toLocaleString() || "0", icon: Eye, color: "text-blue-500" },
              { label: t.analytics.engagementRate, value: analytics?.avgEngagement ? `${analytics.avgEngagement}%` : "0%", icon: Users, color: "text-purple-500" },
              { label: t.analytics.retentionScore, value: analytics?.avgRetention ? `${Math.round(analytics.avgRetention)}/100` : "—", icon: TrendingUp, color: "text-emerald-500" },
            ].map((stat, i) => (
              <Card key={i} className="glass-card border-border" data-testid={`card-stat-${i}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl bg-muted border border-border ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold font-display text-foreground">{stat.value}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glass-card border-border">
            <CardHeader>
              <CardTitle className="text-xl font-display text-foreground">{t.analytics.contentPerformance}</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedContent && generatedContent.length > 0 ? (
                <div className="space-y-4">
                  {generatedContent.slice(0, 5).map((item: any, i: number) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border group hover:bg-muted transition-all" data-testid={`card-best-${i}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-foreground line-clamp-1">{item.content.substring(0, 60)}...</h4>
                          <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">{item.format} · {item.platform || "multi"}</span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-sm font-bold text-foreground">{item.status}</p>
                          <p className="text-[10px] text-muted-foreground">{t.common.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                  <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-sm mb-4 italic">{t.analytics.emptyPerformance}</p>
                  <Button onClick={() => setLocation("/library")} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-12 font-bold shadow-lg shadow-primary/20" data-testid="button-go-library">
                    {t.analytics.goToLibrary}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-border bg-gradient-to-b from-muted/30 to-transparent">
            <CardHeader>
              <CardTitle className="text-xl font-display text-foreground">{t.analytics.contentPipeline}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                {[
                  { label: t.analytics.sourcesUploaded, value: analytics?.sourceCount || 0, status: (analytics?.sourceCount || 0) > 0 ? t.common.done : t.common.pending },
                  { label: t.analytics.briefsGenerated, value: analytics?.briefCount || 0, status: (analytics?.briefCount || 0) > 0 ? t.common.done : t.common.pending },
                  { label: t.analytics.contentCreatedLabel, value: analytics?.generatedCount || 0, status: (analytics?.generatedCount || 0) > 0 ? t.common.done : t.common.pending },
                  { label: t.analytics.performanceTracked, value: analytics?.totalViews || 0, status: (analytics?.totalViews || 0) > 0 ? t.common.done : t.common.pending }
                ].map((item, i) => (
                  <div key={i} className="relative" data-testid={`timeline-${i}`}>
                    <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${item.status === t.common.done ? 'bg-primary shadow-[0_0_8px_hsla(var(--primary)/0.5)]' : 'bg-muted-foreground/20'}`} />
                    <h5 className={`text-xs font-bold ${item.status === t.common.done ? 'text-foreground' : 'text-muted-foreground/50'}`}>{item.label}</h5>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground">{item.value} {t.common.total}</p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        item.status === t.common.done ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                      }`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => setLocation("/library")} className="w-full mt-10 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-xl font-bold" data-testid="button-upload-content-analytics">
                <Upload className="w-4 h-4 mr-2" />
                {t.analytics.uploadContent}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
