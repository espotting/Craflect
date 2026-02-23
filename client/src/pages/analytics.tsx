import { DashboardLayout } from "@/components/layout";
import { BarChart3, TrendingUp, Users, Eye } from "lucide-react";

export default function Analytics() {
  return (
    <DashboardLayout>
      <div className="mb-10">
        <h1 className="font-display text-4xl font-bold text-white mb-2 text-glow">Performance</h1>
        <p className="text-white/50">Track how your generated content performs across platforms.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: "Total Views", value: "0", trend: "+0%", icon: Eye, color: "text-blue-400" },
          { label: "Engagement Rate", value: "0.0%", trend: "+0%", icon: Users, color: "text-purple-400" },
          { label: "Retention Score", value: "0", trend: "+0", icon: TrendingUp, color: "text-emerald-400" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-white/5 border border-white/5 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                {stat.trend}
              </span>
            </div>
            <p className="text-sm text-white/50 font-medium mb-1">{stat.label}</p>
            <p className="text-3xl font-bold font-display text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card h-[400px] rounded-2xl flex items-center justify-center border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative z-10 flex flex-col items-center">
          <BarChart3 className="w-12 h-12 text-white/20 mb-4" />
          <p className="font-display font-medium text-white/50">Connect platforms to view analytics</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
