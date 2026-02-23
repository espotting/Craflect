import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Upload, FileVideo, FileAudio, FileText, Link as LinkIcon } from "lucide-react";

export default function Library() {
  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl font-bold text-white mb-2 text-glow">Content Library</h1>
          <p className="text-white/50">Your ingested source materials ready for repurposing.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 neon-border h-11 px-6">
          <Upload className="w-5 h-5 mr-2" />
          Ingest Content
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { icon: FileVideo, label: "Videos", count: 0, color: "text-blue-400" },
          { icon: FileAudio, label: "Podcasts", count: 0, color: "text-purple-400" },
          { icon: FileText, label: "Articles", count: 0, color: "text-emerald-400" },
          { icon: LinkIcon, label: "Links", count: 0, color: "text-amber-400" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-white/5 border border-white/5 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-white">{stat.count}</p>
              <p className="text-sm text-white/50 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-20 text-center flex flex-col items-center justify-center border-dashed border-2 border-white/10">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Upload className="w-8 h-8 text-white/40" />
        </div>
        <h3 className="font-display text-xl font-bold text-white mb-2">Library is empty</h3>
        <p className="text-white/50 max-w-sm mb-6">Upload videos, audio, or text documents to start building your content engine.</p>
        <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full px-8">
          Upload Files
        </Button>
      </div>
    </DashboardLayout>
  );
}
