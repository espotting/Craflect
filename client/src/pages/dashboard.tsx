import { DashboardLayout } from "@/components/layout";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspaces";
import { useSources, useGeneratedContent } from "@/hooks/use-sources";
import { useBriefs } from "@/hooks/use-briefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderKanban, ArrowRight, Loader2, Sparkles, Send, Calendar, CheckCircle2, Upload, Wand2 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createMutation = useCreateWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const selectedWorkspace = workspaces?.[0];
  const { data: sources } = useSources(selectedWorkspace?.id);
  const { data: generatedContent } = useGeneratedContent(selectedWorkspace?.id);
  const { data: briefs } = useBriefs(selectedWorkspace?.id);

  const latestBrief = briefs?.[0];
  const latestContent = generatedContent?.slice(0, 3);
  const scheduledContent = generatedContent?.filter(c => c.status === "scheduled") || [];

  const hasWorkspace = (workspaces?.length || 0) > 0;
  const hasSources = (sources?.length || 0) > 0;
  const hasContent = (generatedContent?.length || 0) > 0;

  const onboardingSteps = [
    { label: "Create workspace", done: hasWorkspace },
    { label: "Upload source", done: hasSources },
    { label: "Generate content", done: hasContent },
    { label: "Track performance", done: false },
  ];
  const completedSteps = onboardingSteps.filter(s => s.done).length;
  const progressPercent = Math.round((completedSteps / onboardingSteps.length) * 100);

  const getNextAction = () => {
    if (!hasWorkspace) return { label: "Create your first workspace", action: () => setIsOpen(true), cta: "Create Workspace" };
    if (!hasSources) return { label: "Upload your first content source to start generating.", action: () => setLocation("/library"), cta: "Upload Source" };
    if (!hasContent) return { label: "Generate content from your sources or a brief.", action: () => setLocation("/library"), cta: "Generate Content" };
    return { label: "Generate content from today's brief to stay consistent.", action: () => setLocation("/briefs"), cta: "View Briefs" };
  };

  const nextAction = getNextAction();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({ name });
      setIsOpen(false);
      setName("");
      toast({ title: "Workspace created", description: "Your new workspace is ready." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create workspace", variant: "destructive" });
    }
  };

  const createDialog = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 neon-border h-11 px-6" data-testid="button-new-workspace">
          <Plus className="w-5 h-5 mr-2" />
          New Workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create Workspace</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            A workspace organizes your content sources and generated briefs for a specific brand.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Workspace Name</label>
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
            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Workspace"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
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
          <h3 className="font-display text-2xl font-bold text-foreground mb-2">No workspaces yet</h3>
          <p className="text-muted-foreground max-w-md mb-8">Create your first workspace to start ingesting content and generating briefs.</p>
          {createDialog}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card className="glass-card border-primary/20 bg-primary/5 border-2 shadow-lg shadow-primary/5">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-foreground" data-testid="text-next-action">Next best action</h3>
                <p className="text-sm text-muted-foreground">{nextAction.label}</p>
              </div>
            </div>
            <Button onClick={nextAction.action} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 px-8 font-bold shadow-xl shadow-primary/20 group" data-testid="button-next-action">
              {nextAction.cta}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted border border-border text-xs text-muted-foreground" data-testid="text-ai-learning">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          The AI is learning from your performance. Recommendations will improve automatically.
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-2">Cockpit IA</h1>
            <p className="text-muted-foreground">Turn your videos into weeks of content.</p>
          </div>
          {createDialog}
        </div>

        {latestBrief ? (
          <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Latest Brief</span>
              </div>
              <CardTitle className="text-2xl font-display text-foreground">{latestBrief.topic}</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hook</h4>
                <div className="p-3 rounded-lg bg-background/50 border border-border text-sm text-foreground/90 italic" data-testid="text-brief-hook">
                  "{latestBrief.hook}"
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={() => setLocation("/briefs")} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 px-8" data-testid="button-view-brief">
                  View Full Brief
                </Button>
                <Badge variant="outline" className="rounded-full">{latestBrief.format}</Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-border border-dashed border-2">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-4" />
              <h3 className="font-display text-lg font-bold text-foreground mb-2">No brief yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload content sources, then generate your first AI brief.</p>
              <Button onClick={() => setLocation("/briefs")} variant="outline" className="rounded-xl" data-testid="button-go-briefs">
                Go to Briefs
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="glass-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-display text-foreground">Latest Generated Content</CardTitle>
                <Button variant="link" className="text-primary hover:text-primary/80" onClick={() => setLocation("/library")} data-testid="link-view-all-content">View all</Button>
              </CardHeader>
              <CardContent>
                {latestContent && latestContent.length > 0 ? (
                  <div className="space-y-4">
                    {latestContent.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors group" data-testid={`card-content-${item.id}`}>
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border">
                          <Wand2 className="w-6 h-6 text-primary/50" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground mb-1 line-clamp-1">{item.content.substring(0, 80)}</h4>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="rounded-full text-[10px]">{item.format}</Badge>
                            {item.platform && <Badge variant="outline" className="rounded-full text-[10px]">{item.platform}</Badge>}
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter font-bold">{item.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground italic">No content generated yet.</p>
                    <Button onClick={() => setLocation("/library")} variant="link" className="text-primary mt-2" data-testid="link-go-library">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload your first source
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="text-xl font-display text-foreground">Scheduled Content</CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledContent.length > 0 ? (
                  <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                    {scheduledContent.slice(0, 3).map((item, i) => (
                      <div key={item.id} className="relative">
                        <div className={`absolute -left-8 top-1.5 w-4 h-4 rounded-full border-2 ${i === 0 ? 'bg-primary border-primary ring-4 ring-primary/20' : 'bg-background border-border'}`} />
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-foreground line-clamp-1">{item.content.substring(0, 60)}</h4>
                            <p className="text-xs text-muted-foreground">
                              {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Not scheduled"}
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full text-[10px]">{item.platform || item.format}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground italic">No scheduled content yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-display text-foreground">Onboarding</CardTitle>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="text-primary font-bold">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-1.5 bg-muted" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {onboardingSteps.map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${step.done ? 'bg-primary/10 border-primary/20 text-foreground' : 'bg-muted/50 border-border text-muted-foreground'}`} data-testid={`step-${i}`}>
                      <CheckCircle2 className={`w-4 h-4 ${step.done ? 'text-primary' : 'text-muted-foreground/30'}`} />
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                  ))}
                </div>
                {!hasSources && (
                  <Button onClick={() => setLocation("/library")} className="w-full mt-6 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-bold" data-testid="button-upload-first">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload first content
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-border overflow-hidden">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg font-display text-foreground">Workspaces</CardTitle>
              </CardHeader>
              <div className="divide-y divide-border">
                {workspaces?.map((ws) => (
                  <div key={ws.id} className="p-4 hover:bg-accent transition-colors cursor-pointer group flex items-center justify-between" data-testid={`workspace-${ws.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-foreground/80 group-hover:text-foreground">{ws.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
