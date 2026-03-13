import { KPICard } from './KPICard';
import { Card } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, UserPlus, UserMinus } from 'lucide-react';

const signupsData = [
  { date: 'Day 1', signups: 12 },
  { date: 'Day 5', signups: 18 },
  { date: 'Day 10', signups: 15 },
  { date: 'Day 15', signups: 22 },
  { date: 'Day 20', signups: 28 },
  { date: 'Day 25', signups: 24 },
  { date: 'Day 30', signups: 32 },
];

const retentionData = [
  { day: 'Day 1', rate: 100 },
  { day: 'Day 3', rate: 68 },
  { day: 'Day 7', rate: 52 },
  { day: 'Day 14', rate: 41 },
  { day: 'Day 21', rate: 36 },
  { day: 'Day 30', rate: 32 },
  { day: 'Day 60', rate: 28 },
  { day: 'Day 90', rate: 25 },
];

export function GrowthMetricsSection() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Growth Metrics</h2>
          <p className="text-sm text-muted-foreground">User acquisition & retention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="New Users Today" value="12" change={20} trend="up" changeLabel="vs yesterday" icon={<UserPlus className="w-5 h-5" />} />
        <KPICard title="New Users (7 days)" value="89" change={15.5} trend="up" changeLabel="vs last week" icon={<Users className="w-5 h-5" />} />
        <KPICard title="New Users (30 days)" value="342" change={22.8} trend="up" changeLabel="vs last month" icon={<TrendingUp className="w-5 h-5" />} />
        <KPICard title="Retention Rate" value="32%" subtitle="Day 30 retention" change={2.5} trend="up" changeLabel="vs last month" status="healthy" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Churn Rate" value="4.2%" change={-0.8} trend="up" changeLabel="vs last month (good)" status="healthy" icon={<UserMinus className="w-5 h-5" />} />
        <KPICard title="Net Growth" value="+318" subtitle="New - Churned (30d)" change={18.5} trend="up" changeLabel="vs last month" status="healthy" />
        <KPICard title="Growth Rate" value="8.5%" subtitle="MoM user growth" change={1.2} trend="up" changeLabel="vs last month" />
        <KPICard title="Viral Coefficient" value="Coming soon" comingSoon />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Signups</h3>
            <p className="text-sm text-muted-foreground">New user registrations - Last 30 days</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <defs>
                  <linearGradient id="signupsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="signups" stroke="#f97316" strokeWidth={3} fill="url(#signupsGradient)" dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Retention Curve</h3>
            <p className="text-sm text-muted-foreground">User retention over time</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(value: number) => [`${value}%`, 'Retention']} />
                <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}
