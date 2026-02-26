import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, History, Save, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Briefs() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-white mb-2 text-glow">Daily Briefs</h1>
            <p className="text-white/50">Actionable content ideas curated by AI.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl h-11 px-6">
              <History className="w-5 h-5 mr-2" />
              History
            </Button>
            <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-xl shadow-lg shadow-primary/20 neon-border h-11 px-6">
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Brief
            </Button>
          </div>
        </div>

        {/* Action Screen Pattern */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card border-primary/20 bg-primary/5 relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/20 text-primary border-primary/20">Active Brief</Badge>
                <div className="flex items-center gap-1 text-xs text-white/40">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  High Potential Score
                </div>
              </div>
              <CardTitle className="text-2xl font-display text-white mt-4">Comment scaler son agence en 2026</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-white/70 leading-relaxed">
                Basé sur votre dernier podcast, ce brief se concentre sur l'automatisation des process créatifs. 
                L'angle recommandé est "L'agence hybride : IA + Expertise humaine".
              </p>
              
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Suggested Hooks</h4>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/90 italic">
                  "J'ai automatisé 80% de ma production de contenu et mon reach a triplé. Voici comment..."
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold shadow-lg shadow-primary/20">
                  Generate content from brief
                </Button>
                <Button variant="outline" size="icon" className="w-12 h-12 border-white/10 text-white hover:bg-white/5 rounded-xl">
                  <Save className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center justify-center p-10 glass-card rounded-2xl border-dashed border-2 border-white/10 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Calendar className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-2">Daily Brief empty</h3>
            <p className="text-white/50 text-sm max-w-xs mb-6">The AI needs source material to create personalized ideas.</p>
            <Button variant="link" className="text-primary hover:text-primary/80">Go to Library</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
