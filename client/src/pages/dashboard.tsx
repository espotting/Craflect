import { DashboardLayout } from "@/components/layout";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderKanban, ArrowRight, Loader2 } from "lucide-react";
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

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl font-bold text-white mb-2 text-glow">Workspaces</h1>
          <p className="text-white/50">Manage your brands and content hubs.</p>
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl glass-card animate-pulse bg-white/5 border-white/5" />
          ))}
        </div>
      ) : workspaces?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 glass-card rounded-3xl border-dashed border-2 border-white/10 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <FolderKanban className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-white mb-2">No workspaces yet</h3>
          <p className="text-white/50 max-w-md mb-8">Create your first workspace to start ingesting content and generating briefs.</p>
          <Button onClick={() => setIsOpen(true)} className="bg-white/10 hover:bg-white/20 text-white rounded-full px-8 h-12">
            Create your first workspace
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces?.map((ws) => (
            <div key={ws.id} className="glass-card p-6 rounded-2xl group cursor-pointer flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors" />
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-center text-primary font-display font-bold text-xl">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white group-hover:text-primary transition-colors">{ws.name}</h3>
                  <p className="text-xs text-white/40">Created {new Date(ws.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                <span className="text-sm font-medium text-white/50">Open Workspace</span>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-1">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
