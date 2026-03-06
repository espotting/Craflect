import { cn } from "@/lib/utils";

interface TrendScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(score: number): { bg: string; text: string; ring: string } {
  if (score >= 80) return { bg: "bg-emerald-500/15", text: "text-emerald-500", ring: "ring-emerald-500/30" };
  if (score >= 60) return { bg: "bg-blue-500/15", text: "text-blue-500", ring: "ring-blue-500/30" };
  if (score >= 40) return { bg: "bg-amber-500/15", text: "text-amber-500", ring: "ring-amber-500/30" };
  if (score >= 20) return { bg: "bg-orange-500/15", text: "text-orange-500", ring: "ring-orange-500/30" };
  return { bg: "bg-red-500/15", text: "text-red-500", ring: "ring-red-500/30" };
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Rising";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Low";
  return "Cold";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
};

export function TrendScore({ score, size = "md", showLabel = false, className }: TrendScoreProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const colors = getScoreColor(clamped);
  const label = getScoreLabel(clamped);

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid={`trend-score-${clamped}`}>
      <div
        className={cn(
          "rounded-md flex items-center justify-center font-bold ring-1",
          colors.bg,
          colors.text,
          colors.ring,
          sizeClasses[size]
        )}
      >
        {clamped}
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium", colors.text)}>{label}</span>
      )}
    </div>
  );
}
