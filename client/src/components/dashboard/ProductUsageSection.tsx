import { KPICard } from './KPICard';
import { Card } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, FileText, Layers, Play, Sparkles } from 'lucide-react';

const activityData = [
  { date: 'Day 1', dau: 420, wau: 1200, mau: 3500 },
  { date: 'Day 5', dau: 380, wau: 1150, mau: 3450 },
  { date: 'Day 10', dau: 450, wau: 1280, mau: 3600 },
  { date: 'Day 15', dau: 520, wau: 1350, mau: 3800 },
  { date: 'Day 20', dau: 480, wau: 1400, mau: 3900 },
  { date: 'Day 25', dau: 550, wau: 1520, mau: 4100 },
  { date: 'Day 30', dau: 590, wau: 1650, mau: 4350 },
];

const videosData = [
  { date: 'Mon', videos: 45 },
  { date: 'Tue', videos: 52 },
  { date: 'Wed', videos: 38 },
  { date: 'Thu', videos: 65 },
  { date: 'Fri', videos: 78 },
  { date: 'Sat', videos: 42 },
  { date: 'Sun', videos: 35 },
];

export function ProductUsageSection() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Product Usage</h2>
          <p className="text-sm text-muted-foreground">How users engage with the platform</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="DAU" value="590" subtitle="Daily Active Users" change={15.2} trend="up" changeLabel="vs yesterday" />
        <KPICard title="WAU" value="1,650" subtitle="Weekly Active Users" change={8.5} trend="up" changeLabel="vs last week" />
        <KPICard title="MAU" value="4,350" subtitle="Monthly Active Users" change={12.3} trend="up" changeLabel="vs last month" />
        <KPICard title="Activation Rate" value="68.5%" change={3.2} trend="up" changeLabel="vs last month" status="healthy" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Scripts Generated" value="8,420" change={22.1} trend="up" changeLabel="vs last month" icon={<FileText className="w-5 h-5" />} />
        <KPICard title="Blueprints Generated" value="3,180" change={18.5} trend="up" changeLabel="vs last month" icon={<Layers className="w-5 h-5" />} />
        <KPICard title="Videos Created Today" value="42" change={-5.2} trend="down" changeLabel="vs yesterday" icon={<Play className="w-5 h-5" />} />
        <KPICard title="Videos Created (7 days)" value="355" change={14.8} trend="up" changeLabel="vs last week" icon={<Play className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Videos Created From Opportunities" value="128" subtitle="36% of total videos" change={28.5} trend="up" changeLabel="vs last month" status="healthy" icon={<Sparkles className="w-5 h-5" />} />
        <div className="lg:col-span-3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">User Activity</h3>
            <p className="text-sm text-muted-foreground">DAU / WAU / MAU - Last 30 days</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <defs>
                  <linearGradient id="dauGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="mau" stroke="#94a3b8" strokeWidth={2} fill="none" name="MAU" />
                <Area type="monotone" dataKey="wau" stroke="#22d3ee" strokeWidth={2} fill="none" name="WAU" />
                <Area type="monotone" dataKey="dau" stroke="#8b5cf6" strokeWidth={2} fill="url(#dauGradient)" name="DAU" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Videos Created</h3>
            <p className="text-sm text-muted-foreground">Per day - Last 7 days</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={videosData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="videos" fill="url(#videosGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="videosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}
