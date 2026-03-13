import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
  comingSoon?: boolean;
  icon?: React.ReactNode;
}

export function KPICard({
  title,
  value,
  subtitle,
  change,
  changeLabel = 'vs last period',
  trend = 'neutral',
  status = 'neutral',
  comingSoon = false,
  icon,
}: KPICardProps) {
  const statusColors = {
    healthy: 'bg-emerald-500/10 border-emerald-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    critical: 'bg-red-500/10 border-red-500/30',
    neutral: 'bg-card border-border',
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingDown className="w-4 h-4" />,
    neutral: <Minus className="w-4 h-4" />,
  };

  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  if (comingSoon) {
    return (
      <Card className="p-5 border border-dashed border-border bg-muted/30">
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <div className="flex items-center justify-center py-4">
          <span className="text-sm font-medium text-muted-foreground/60">Coming soon</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-5 border transition-all duration-200 hover:shadow-md', statusColors[status])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <span className={cn('flex items-center gap-1 text-xs font-medium', trendColors[trend])}>
            {trendIcons[trend]}
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-xs text-muted-foreground/60">{changeLabel}</span>
        </div>
      )}
    </Card>
  );
}
