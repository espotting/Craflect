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
import { DollarSign, Users, TrendingUp, UserCheck } from 'lucide-react';

const mrrData = [
  { date: 'Jan', mrr: 2400 },
  { date: 'Feb', mrr: 2800 },
  { date: 'Mar', mrr: 3200 },
  { date: 'Apr', mrr: 3650 },
  { date: 'May', mrr: 4200 },
  { date: 'Jun', mrr: 4850 },
];

const subscribersData = [
  { date: 'Jan', paying: 45, free: 320 },
  { date: 'Feb', paying: 52, free: 380 },
  { date: 'Mar', paying: 61, free: 450 },
  { date: 'Apr', paying: 72, free: 520 },
  { date: 'May', paying: 85, free: 610 },
  { date: 'Jun', paying: 98, free: 720 },
];

export function SaaSMetricsSection() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">SaaS Metrics</h2>
          <p className="text-sm text-muted-foreground">Business performance & revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="MRR" value="$4,850" subtitle="Monthly Recurring Revenue" change={18.5} trend="up" changeLabel="vs last month" status="healthy" icon={<DollarSign className="w-5 h-5" />} />
        <KPICard title="ARR" value="$58,200" subtitle="Annual Recurring Revenue" change={18.5} trend="up" changeLabel="vs last month" status="healthy" icon={<TrendingUp className="w-5 h-5" />} />
        <KPICard title="Total Paying Users" value="98" change={15.3} trend="up" changeLabel="vs last month" icon={<UserCheck className="w-5 h-5" />} />
        <KPICard title="Total Free Users" value="720" change={15.2} trend="up" changeLabel="vs last month" icon={<Users className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="New Subscriptions (30d)" value="18" change={28.5} trend="up" changeLabel="vs last month" icon={<TrendingUp className="w-5 h-5" />} />
        <KPICard title="Churned Users (30d)" value="3" change={-40} trend="up" changeLabel="vs last month (good)" status="healthy" />
        <KPICard title="ARPU" value="$49.50" subtitle="Average Revenue Per User" change={5.2} trend="up" changeLabel="vs last month" />
        <KPICard title="Free → Paid Conversion" value="12.0%" change={1.5} trend="up" changeLabel="vs last month" status="healthy" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">MRR Growth</h3>
            <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(value: number) => [`$${value}`, 'MRR']} />
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={3} fill="url(#mrrGradient)" dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Subscribers Growth</h3>
            <p className="text-sm text-muted-foreground">Paying vs Free users</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subscribersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Line type="monotone" dataKey="paying" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} name="Paying" />
                <Line type="monotone" dataKey="free" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#94a3b8', strokeWidth: 2, r: 3 }} name="Free" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}
