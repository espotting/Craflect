import { DashboardLayout } from "@/components/layout";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useBriefs, useGenerateBrief, useGenerateFromBrief } from "@/hooks/use-briefs";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, History, Save, Zap, FileText, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import type { Brief } from "@shared/schema";

function BriefStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/5",
    saved: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/5",
    archived: "border-muted-foreground/50 text-muted-foreground bg-muted/50",
  };
  return (
    <Badge variant="outline" className={`rounded-full px-2 py-0 text-[10px] uppercase font-bold ${styles[status] || styles.active}`} data-testid={`badge-brief-status-${status}`}>
      {status}
    </Badge>
  );
}

function BriefSkeleton() {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-7 w-3/4 mt-4" />
      </CardHeader>
      <CardContent className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="flex items-center gap-4 pt-4">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

function BriefCard({ brief, workspaceId, isLatest }: { brief: Brief; workspaceId: string; isLatest: boolean }) {
  const { toast } = useToast();
  const generateFromBrief = useGenerateFromBrief();

  const handleGenerate = () => {
    generateFromBrief.mutate(
      { briefId: brief.id, workspaceId },
      {
        onSuccess: (data) => {
          toast({
            title: "Content generated",
            description: `${data.length} content piece(s) created from this brief.`,
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
    <Card
      className={`border-border ${isLatest ? "border-primary/20 bg-primary/5 relative" : ""}`}
      data-testid={`card-brief-${brief.id}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <BriefStatusBadge status={brief.status} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isLatest && <Zap className="w-3 h-3 text-yellow-500" />}
            {createdDate}
          </div>
        </div>
        <CardTitle className="text-2xl font-display text-foreground mt-4" data-testid={`text-brief-topic-${brief.id}`}>
          {brief.topic}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground leading-relaxed" data-testid={`text-brief-script-${brief.id}`}>
          {brief.script.length > 300 ? brief.script.substring(0, 300) + "..." : brief.script}
        </p>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Suggested Hook</h4>
          <div className="p-3 rounded-md bg-background/50 border border-border text-sm text-foreground/90 italic" data-testid={`text-brief-hook-${brief.id}`}>
            {brief.hook}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs" data-testid={`badge-brief-format-${brief.id}`}>
            {brief.format}
          </Badge>
        </div>

        <div className="flex items-center gap-4 pt-4 flex-wrap">
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-bold shadow-lg shadow-primary/20"
            onClick={handleGenerate}
            disabled={generateFromBrief.isPending}
            data-testid={`button-generate-from-brief-${brief.id}`}
          >
            {generateFromBrief.isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 mr-2" />
            )}
            {generateFromBrief.isPending ? "Generating..." : "Generate content from brief"}
          </Button>
        </div>
      </CardContent>
    </Card>
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

  const handleGenerateBrief = () => {
    if (!workspaceId) {
      toast({
        title: "No workspace",
        description: "Create a workspace first to generate briefs.",
        variant: "destructive",
      });
      return;
    }
    generateBrief.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Brief generated",
          description: "Your AI brief is ready.",
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
            <FileText className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground mb-2" data-testid="text-no-workspace">No workspace yet</h3>
          <p className="text-muted-foreground max-w-md mb-8">Create a workspace first to start generating AI briefs.</p>
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
            <h1 className="font-display text-4xl font-bold text-foreground mb-2" data-testid="text-page-title">Daily Briefs</h1>
            <p className="text-muted-foreground">Actionable content ideas curated by AI.</p>
          </div>
          <div className="flex gap-3">
            {historyBriefs.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                data-testid="button-history"
              >
                <History className="w-5 h-5 mr-2" />
                {showHistory ? "Hide History" : `History (${historyBriefs.length})`}
              </Button>
            )}
            <Button
              onClick={handleGenerateBrief}
              disabled={generateBrief.isPending}
              data-testid="button-generate-brief"
            >
              {generateBrief.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              {generateBrief.isPending ? "Generating..." : "Generate Brief"}
            </Button>
          </div>
        </div>

        {isLoading || generateBrief.isPending ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <BriefSkeleton />
            <BriefSkeleton />
          </div>
        ) : latestBrief ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <BriefCard brief={latestBrief} workspaceId={workspaceId!} isLatest />

              <div className="flex flex-col items-center justify-center p-10 rounded-md border-dashed border-2 border-border text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2" data-testid="text-generate-cta">Want another angle?</h3>
                <p className="text-muted-foreground text-sm max-w-xs mb-6">Generate a new brief to explore different content ideas from your sources.</p>
                <Button
                  variant="outline"
                  onClick={handleGenerateBrief}
                  disabled={generateBrief.isPending}
                  data-testid="button-generate-another"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Another Brief
                </Button>
              </div>
            </div>

            {showHistory && historyBriefs.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold text-foreground" data-testid="text-history-title">Brief History</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {historyBriefs.map((brief) => (
                    <BriefCard key={brief.id} brief={brief} workspaceId={workspaceId!} isLatest={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col items-center justify-center p-10 rounded-md border-dashed border-2 border-border text-center lg:col-span-2">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2" data-testid="text-empty-state">No briefs yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                Generate your first AI brief to get personalized content ideas. Add sources to your library for better results.
              </p>
              <div className="flex gap-3 flex-wrap justify-center">
                <Button
                  onClick={handleGenerateBrief}
                  disabled={generateBrief.isPending}
                  data-testid="button-first-brief"
                >
                  {generateBrief.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  Generate First Brief
                </Button>
                <Button variant="outline" onClick={() => navigate("/library")} data-testid="link-go-to-library">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Go to Library
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
