import { DashboardLayout } from "@/components/layout";
import { BarChart3, TrendingUp, Users, Eye, Trophy, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Analytics() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-white mb-2 text-glow">Analytics</h1>
          <p className="text-white/50">The learning loop of your content engine.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Views", value: "12.4K", trend: "+12%", icon: Eye, color: "text-blue-400" },
            { label: "Engagement Rate", value: "4.8%", trend: "+2.4%", icon: Users, color: "text-purple-400" },
            { label: "Retention Score", value: "72/100", trend: "+5", icon: TrendingUp, color: "text-emerald-400" },
          ].map((stat, i) => (
            <Card key={i} className="glass-card border-white/5">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl bg-white/5 border border-white/5 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                    {stat.trend}
                  </span>
                </div>
                <p className="text-xs text-white/50 font-medium mb-1 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold font-display text-white">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-xl font-display text-white">Best performing content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Hook Pattern #4", views: "5.2K", type: "From Brief" },
                  { title: "Case Study Breakdown", views: "3.1K", type: "Manual" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">{item.title}</h4>
                        <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">{item.type}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-sm font-bold text-white">{item.views}</p>
                        <p className="text-[10px] text-white/40">views</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-white/20 group-hover:text-primary transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
                <div className="mt-8 flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                  <p className="text-white/40 text-sm mb-4 italic">Publish content to start learning what works.</p>
                  <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 h-12 font-bold shadow-lg shadow-primary/20">
                    Create similar content
                  </Button>
                </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
            <CardHeader>
              <CardTitle className="text-xl font-display text-white">Conversion Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                {[
                  { label: "Source Uploaded", time: "Oct 12", active: true },
                  { label: "Brief Generated", time: "Oct 13", active: true },
                  { label: "Content Published", time: "Oct 14", active: true },
                  { label: "Performance Tracked", time: "Waiting", active: false }
                ].map((item, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${item.active ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'bg-white/10'}`} />
                    <h5 className={`text-xs font-bold ${item.active ? 'text-white' : 'text-white/30'}`}>{item.label}</h5>
                    <p className="text-[10px] text-white/40">{item.time}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-10 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-xl font-bold">
                Create similar content
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
