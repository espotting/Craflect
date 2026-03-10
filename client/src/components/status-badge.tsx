import { Badge } from "@/components/ui/badge";

type ProjectStatus = "idea" | "script" | "blueprint" | "completed";

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const config: Record<ProjectStatus, { color: string; label: string }> = {
  idea: { color: "bg-slate-500/20 text-slate-400 border-slate-500/30", label: "Idea" },
  script: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Script" },
  blueprint: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Blueprint" },
  completed: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Ready" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { color, label } = config[status] || config.idea;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color} ${className || ""}`}
      data-testid={`badge-status-${status}`}
    >
      {label}
    </span>
  );
}
