import { DashboardLayout } from "@/components/layout";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderKanban, ArrowRight, Loader2, Sparkles, Send, Calendar, CheckCircle2 } from "lucide-react";
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

export default function Dashboard() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createMutation = useCreateWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    try {
      await createMutation.mutateAsync({ name });
      setIsOpen(false);
      setName("");
      toast({
        title: "Workspace created",
        description: "Your new workspace is ready.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create workspace",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl glass-card animate-pulse bg-white/5 border-white/5" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (workspaces?.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-20 glass-card rounded-3xl border-dashed border-2 border-white/10 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <FolderKanban className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-white mb-2">No workspaces yet</h3>
          <p className="text-white/50 max-w-md mb-8">Create your first workspace to start ingesting content and generating briefs.</p>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white/10 hover:bg-white/20 text-white rounded-full px-8 h-12">
                Create your first workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Create Workspace</DialogTitle>
                <DialogDescription className="text-white/50">
                  A workspace organizes your content sources and generated briefs for a specific brand.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Workspace Name</label>
                  <Input 
                    placeholder="e.g. Acme Corp Marketing" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background border-white/10 text-white h-12 rounded-xl focus-visible:ring-primary focus-visible:border-primary"
                    autoFocus
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 font-medium"
                  disabled={createMutation.isPending || !name.trim()}
                >
                  {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Workspace"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Next Best Action */}
        <Card className="glass-card border-primary/20 bg-primary/5 border-2 shadow-lg shadow-primary/5">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-white">Next best action</h3>
                <p className="text-sm text-white/60">Generate content from today’s brief to stay consistent.</p>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-8 font-bold shadow-xl shadow-primary/20 group">
              Generate content
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* AI Learning Notification */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          The AI is learning from your performance. Recommendations will improve automatically.
        </div>

        {/* Cockpit Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-white mb-2 text-glow">Cockpit IA</h1>
            <p className="text-white/50">Turn your videos into weeks of content.</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 neon-border h-11 px-6">
                <Plus className="w-5 h-5 mr-2" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Create Workspace</DialogTitle>
                <DialogDescription className="text-white/50">
                  A workspace organizes your content sources and generated briefs for a specific brand.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Workspace Name</label>
                  <Input 
                    placeholder="e.g. Acme Corp Marketing" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background border-white/10 text-white h-12 rounded-xl focus-visible:ring-primary focus-visible:border-primary"
                    autoFocus
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 font-medium"
                  disabled={createMutation.isPending || !name.trim()}
                >
                  {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Workspace"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bloc 1 — Daily Brief du jour (hero) */}
        <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Suggestion IA</span>
            </div>
            <CardTitle className="text-2xl font-display text-white">Daily Brief du jour</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Comment scaler son agence en 2026", score: "High" },
                { title: "3 erreurs fatales en content marketing", score: "Medium" },
                { title: "L'impact de l'IA sur la création", score: "High" }
              ].map((idea, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${idea.score === 'High' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {idea.score} Potential
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white/90 group-hover:text-white">{idea.title}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-8">
                Generate Content from Brief
              </Button>
              <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl h-12">
                Save Brief
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1 & 2 */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bloc 2 — Derniers contenus générés */}
            <Card className="glass-card border-white/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-display text-white">Derniers contenus générés</CardTitle>
                <Button variant="link" className="text-primary hover:text-primary/80">View all</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                      <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                        <div className="w-8 h-8 bg-primary/20 rounded-full animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white mb-1">Post LinkedIn - Scaler son agence</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/40 uppercase tracking-tighter font-bold">Ready</span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-[10px] text-white/40 uppercase tracking-tighter font-bold">2 hours ago</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" className="text-white/50 hover:text-white rounded-lg">
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-white/50 hover:text-white rounded-lg">
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bloc 3 — Prochain contenu à publier */}
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="text-xl font-display text-white">Prochain contenu à publier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                  {[
                    { title: "Instagram Reel - 3 conseils hooks", status: "Prêt", time: "Demain 10:00", active: true },
                    { title: "LinkedIn Post - Case Study", status: "En cours", time: "Vendredi 15:00", active: false }
                  ].map((item, i) => (
                    <div key={i} className="relative">
                      <div className={`absolute -left-8 top-1.5 w-4 h-4 rounded-full border-2 ${item.active ? 'bg-primary border-primary ring-4 ring-primary/20' : 'bg-background border-white/10'}`} />
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`text-sm font-medium ${item.active ? 'text-white' : 'text-white/50'}`}>{item.title}</h4>
                          <p className="text-xs text-white/40">{item.time}</p>
                        </div>
                        <Button variant="outline" size="sm" className="border-white/10 text-white rounded-lg text-xs h-8">
                          <Calendar className="w-3 h-3 mr-2" />
                          Schedule later
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 3 */}
          <div className="space-y-8">
            {/* Bloc 4 — Progression onboarding */}
            <Card className="glass-card border-white/5 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-lg font-display text-white">Onboarding</CardTitle>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/50">Progression</span>
                    <span className="text-primary font-bold">25%</span>
                  </div>
                  <Progress value={25} className="h-1.5 bg-white/5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Upload source", done: true },
                    { label: "Generate brief", done: false },
                    { label: "Generate content", done: false },
                    { label: "Track performance", done: false }
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${step.done ? 'bg-primary/10 border-primary/20 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${step.done ? 'text-primary' : 'text-white/20'}`} />
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-6 bg-white text-black hover:bg-white/90 rounded-xl font-bold">
                  Upload first content
                </Button>
              </CardContent>
            </Card>

            {/* Workspaces List (Mini) */}
            <Card className="glass-card border-white/5 overflow-hidden">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-lg font-display text-white">Mes Workspaces</CardTitle>
              </CardHeader>
              <div className="divide-y divide-white/5">
                {workspaces?.map((ws) => (
                  <div key={ws.id} className="p-4 hover:bg-white/5 transition-colors cursor-pointer group flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-white/80 group-hover:text-white">{ws.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary transition-transform group-hover:translate-x-1" />
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
