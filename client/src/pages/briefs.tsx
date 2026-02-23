import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar } from "lucide-react";

export default function Briefs() {
  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl font-bold text-white mb-2 text-glow">Daily Content Briefs</h1>
          <p className="text-white/50">AI-generated concepts and scripts based on your library.</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-xl shadow-lg shadow-primary/20 neon-border h-11 px-6">
          <Sparkles className="w-5 h-5 mr-2" />
          Generate New Brief
        </Button>
      </div>

      <div className="glass-card rounded-2xl p-16 text-center flex flex-col items-center justify-center border-white/5">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <div className="w-20 h-20 relative z-10 rounded-full bg-gradient-to-b from-card to-background border border-primary/30 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h3 className="font-display text-2xl font-bold text-white mb-3">No briefs generated yet</h3>
        <p className="text-white/50 max-w-md mb-8 leading-relaxed">
          The AI needs source material in your Library first. Once uploaded, Craflect will analyze and synthesize personalized content briefs.
        </p>
        <Button className="bg-white/10 hover:bg-white/20 text-white rounded-full px-8 h-12 backdrop-blur-md border border-white/10">
          Go to Library
        </Button>
      </div>
    </DashboardLayout>
  );
}
