export interface PredictedViewsResult {
  min: number;
  max: number;
  label: string;
}

export function getPredictedViews(viralityScore: number | null | undefined): PredictedViewsResult {
  if (viralityScore === null || viralityScore === undefined) {
    return { min: 10000, max: 50000, label: "10K – 50K" };
  }

  if (viralityScore >= 80) {
    return { min: 300000, max: 1000000, label: "300K – 1M" };
  }
  if (viralityScore >= 60) {
    return { min: 120000, max: 600000, label: "120K – 600K" };
  }
  if (viralityScore >= 40) {
    return { min: 50000, max: 200000, label: "50K – 200K" };
  }
  return { min: 10000, max: 50000, label: "10K – 50K" };
}

export function getViralityColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
  if (score >= 60) return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
  if (score >= 40) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400";
  return "bg-muted text-muted-foreground";
}

export function getViralityLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return "N/A";
  if (score >= 80) return "High";
  if (score >= 60) return "Good";
  if (score >= 40) return "Medium";
  return "Low";
}

export function formatCompactNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
