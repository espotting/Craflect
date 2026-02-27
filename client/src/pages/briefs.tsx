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
            <h1 className="font-display text-4xl font-bold text-foreground mb-2">Daily Briefs</h1>
            <p className="text-muted-foreground">Actionable content ideas curated by AI.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-border text-foreground hover:bg-accent rounded-xl h-11 px-6" data-testid="button-history">
              <History className="w-5 h-5 mr-2" />
              History
            </Button>
            <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-xl shadow-lg shadow-primary/20 neon-border h-11 px-6" data-testid="button-generate-brief">
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Brief
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card border-primary/20 bg-primary/5 relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/20 text-primary border-primary/20">Active Brief</Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  High Potential Score
                </div>
              </div>
              <CardTitle className="text-2xl font-display text-foreground mt-4">Comment scaler son agence en 2026</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground leading-relaxed">
                Base sur votre dernier podcast, ce brief se concentre sur l'automatisation des process creatifs. 
                L'angle recommande est "L'agence hybride : IA + Expertise humaine".
              </p>
              
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Suggested Hooks</h4>
                <div className="p-3 rounded-lg bg-background/50 border border-border text-sm text-foreground/90 italic">
                  "J'ai automatise 80% de ma production de contenu et mon reach a triple. Voici comment..."
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 font-bold shadow-lg shadow-primary/20" data-testid="button-generate-from-brief">
                  Generate content from brief
                </Button>
                <Button variant="outline" size="icon" className="w-12 h-12 border-border text-foreground hover:bg-accent rounded-xl" data-testid="button-save-brief">
                  <Save className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center justify-center p-10 glass-card rounded-2xl border-dashed border-2 border-border text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <Calendar className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Daily Brief empty</h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">The AI needs source material to create personalized ideas.</p>
            <Button variant="link" className="text-primary hover:text-primary/80" data-testid="link-go-to-library">Go to Library</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
