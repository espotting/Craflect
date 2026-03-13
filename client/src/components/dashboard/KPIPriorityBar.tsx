import { KPICard } from './KPICard';
import { DollarSign, Users, Play } from 'lucide-react';

export function KPIPriorityBar() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full" />
        <h2 className="text-lg font-bold text-foreground">Priority Metrics</h2>
        <span className="text-sm text-muted-foreground">— At a glance</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="MRR"
          value="$4,850"
          change={18.5}
          trend="up"
          changeLabel="vs last month"
          status="healthy"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <KPICard
          title="DAU"
          value="590"
          change={15.2}
          trend="up"
          changeLabel="vs yesterday"
          icon={<Users className="w-5 h-5" />}
        />
        <KPICard
          title="Videos Created (7 days)"
          value="355"
          change={14.8}
          trend="up"
          changeLabel="vs last week"
          icon={<Play className="w-5 h-5" />}
        />
      </div>
    </section>
  );
}
