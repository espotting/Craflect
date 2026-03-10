import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ViralityBadgeProps {
  score: number;
  className?: string;
}

export function ViralityBadge({ score, className }: ViralityBadgeProps) {
  const getColor = () => {
    if (score >= 90) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (score >= 80) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    if (score >= 60) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getColor()} ${className || ""}`}
      data-testid={`badge-virality-${score}`}
    >
      <Flame className="w-3 h-3" />
      {score}
    </span>
  );
}
