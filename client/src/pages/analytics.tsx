import { DashboardLayout } from "@/components/layout";
import { TrendingUp, Users, Eye, Trophy, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Analytics() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">The learning loop of your content engine.</p>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted border border-border text-xs text-muted-foreground" data-testid="text-ai-analytics-learning">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          The AI is learning from your performance. Recommendations will improve automatically.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Views", value: "12.4K", trend: "+12%", icon: Eye, color: "text-blue-500" },
            { label: "Engagement Rate", value: "4.8%", trend: "+2.4%", icon: Users, color: "text-purple-500" },
            { label: "Retention Score", value: "72/100", trend: "+5", icon: TrendingUp, color: "text-emerald-500" },
          ].map((stat, i) => (
            <Card key={i} className="glass-card border-border" data-testid={`card-stat-${i}`}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl bg-muted border border-border ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                    {stat.trend}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold font-display text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glass-card border-border">
            <CardHeader>
              <CardTitle className="text-xl font-display text-foreground">Best performing content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Hook Pattern #4", views: "5.2K", type: "From Brief" },
                  { title: "Case Study Breakdown", views: "3.1K", type: "Manual" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border group hover:bg-muted transition-all" data-testid={`card-best-${i}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                        <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">{item.type}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.views}</p>
                        <p className="text-[10px] text-muted-foreground">views</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground group-hover:text-primary transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                <p className="text-muted-foreground text-sm mb-4 italic">Publish content to start learning what works.</p>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-12 font-bold shadow-lg shadow-primary/20" data-testid="button-create-similar">
                  Create similar content
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border bg-gradient-to-b from-muted/30 to-transparent">
            <CardHeader>
              <CardTitle className="text-xl font-display text-foreground">Conversion Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                {[
                  { label: "Source Uploaded", time: "Oct 12", status: "Done" },
                  { label: "Brief Generated", time: "Oct 13", status: "Done" },
                  { label: "Content Published", time: "Oct 14", status: "Done" },
                  { label: "Performance Tracked", time: "Waiting", status: "Pending" }
                ].map((item, i) => (
                  <div key={i} className="relative" data-testid={`timeline-${i}`}>
                    <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${item.status === 'Done' ? 'bg-primary shadow-[0_0_8px_hsla(var(--primary)/0.5)]' : 'bg-muted-foreground/20'}`} />
                    <h5 className={`text-xs font-bold ${item.status === 'Done' ? 'text-foreground' : 'text-muted-foreground/50'}`}>{item.label}</h5>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground">{item.time}</p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        item.status === 'Done' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                      }`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-10 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-xl font-bold" data-testid="button-create-similar-timeline">
                Create similar content
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
