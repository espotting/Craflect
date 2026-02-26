import { DashboardLayout } from "@/components/layout";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import { Plus, Video, FileText, Sparkles, Wand2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Library() {
  const { data: workspaces } = useWorkspaces();
  const selectedWorkspace = workspaces?.[0];

  if (!selectedWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-20 glass-card rounded-3xl border-dashed border-2 border-white/10 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Video className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-white mb-2">Library empty</h3>
          <p className="text-white/50 max-w-md mb-8">Upload your first content to start generating posts automatically.</p>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-12">
            Upload content
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-white mb-2 text-glow">Content Library</h1>
            <p className="text-white/50">Manage your source materials and transformations.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 neon-border h-11 px-8 font-bold">
            <Plus className="w-5 h-5 mr-2" />
            Upload Source
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Podcast Ep 12 - AI Future", type: "video", status: "Ready", contentCount: 5 },
            { title: "Blog Post - SEO Tips", type: "text", status: "Analyzed", contentCount: 3 },
            { title: "YT Short - Hook Idea", type: "video", status: "Generated", contentCount: 8 },
          ].map((source, i) => (
            <Card key={i} className="glass-card border-white/5 group hover:border-primary/30 transition-all">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                  {source.type === 'video' ? <Video className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-blue-400" />}
                </div>
                <Badge variant="outline" className={`rounded-full px-2 py-0 text-[10px] uppercase font-bold ${
                  source.status === 'Ready' ? 'border-green-500/50 text-green-400 bg-green-500/5' : 
                  source.status === 'Analyzed' ? 'border-blue-500/50 text-blue-400 bg-blue-500/5' : 
                  'border-primary/50 text-primary bg-primary/5'
                }`}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {source.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg font-display text-white mb-1 group-hover:text-primary transition-colors">{source.title}</CardTitle>
                <p className="text-xs text-white/40 mb-6">{source.contentCount} assets generated from this source</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" className="bg-white/5 hover:bg-white/10 text-white border-white/5 rounded-lg text-xs h-9">
                    <Wand2 className="w-3.5 h-3.5 mr-2" />
                    Generate
                  </Button>
                  <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5 rounded-lg text-xs h-9">
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Create Brief
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
