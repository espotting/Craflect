import { KPICard } from './KPICard';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Database, Activity, Users, Zap } from 'lucide-react';

const ingestionData = [
  { date: 'Day 1', videos: 1200 },
  { date: 'Day 5', videos: 1350 },
  { date: 'Day 10', videos: 1180 },
  { date: 'Day 15', videos: 1520 },
  { date: 'Day 20', videos: 1680 },
  { date: 'Day 25', videos: 1450 },
  { date: 'Day 30', videos: 1890 },
];

export function PlatformHealthSection() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Platform Health</h2>
          <p className="text-sm text-muted-foreground">Data engine performance & dataset status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Videos in Dataset" value="124,589" change={12.5} trend="up" changeLabel="vs last month" icon={<Database className="w-5 h-5" />} />
        <KPICard title="Videos Ingested (24h)" value="1,890" change={8.3} trend="up" changeLabel="vs yesterday" icon={<Activity className="w-5 h-5" />} />
        <KPICard title="Videos Classified" value="118,420" subtitle="95.0% of dataset" status="healthy" icon={<Zap className="w-5 h-5" />} />
        <KPICard title="Classification Success Rate" value="94.2%" change={2.1} trend="up" changeLabel="vs last week" status="healthy" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Unique Creators Detected" value="45,230" change={5.7} trend="up" changeLabel="vs last month" icon={<Users className="w-5 h-5" />} />
        <KPICard title="Dataset Growth (30d)" value="+12.5%" change={12.5} trend="up" changeLabel="vs last month" status="healthy" icon={<Database className="w-5 h-5" />} />
        <KPICard title="Patterns Detected" value="Coming soon" comingSoon />
        <KPICard title="Opportunities Generated Today" value="Coming soon" comingSoon />
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Video Ingestion</h3>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-violet-500 rounded-full" />
            <span className="text-sm text-muted-foreground">Videos ingested</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ingestionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
              <Line type="monotone" dataKey="videos" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}
