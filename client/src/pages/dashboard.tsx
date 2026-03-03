import { DashboardLayout } from "@/components/layout";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspaces";
import { useLanguage } from "@/hooks/use-language";
import { useSelectedNiche } from "@/hooks/use-selected-niche";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Brain, Info, BarChart3, Zap, Target, ArrowRight, Activity, Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Building: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Mature: "bg-primary/15 text-primary border-primary/20",
  };
  const cls = colorMap[status] || colorMap.Building;
  return (
    <Badge variant="outline" className={`text-[11px] rounded-full ${cls}`} data-testid="badge-intelligence-status">
      {status}
    </Badge>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function StatItem({ label, value, tooltip }: { label: string; value: string | number; tooltip?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <span className="text-sm font-bold text-foreground" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {value}
      </span>
    </div>
  );
}

function SnapshotCard({ title, items, icon: Icon }: { title: string; items: { name: string; pct: number }[]; icon: React.ElementType }) {
  return (
    <Card data-testid={`card-snapshot-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        </div>
        <div className="space-y-2">
          {items.slice(0, 3).map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <span className="text-sm text-foreground truncate">{item.name.replace(/_/g, " ")}</span>
              <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{item.pct}%</span>
            </div>
          ))}
          {items.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createMutation = useCreateWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const { data: availableNiches } = useQuery<any[]>({
    queryKey: ["/api/niches/available"],
  });

  const { selectedNicheId, setSelectedNicheId } = useSelectedNiche();
  const [nicheOpen, setNicheOpen] = useState(false);
  const [intelligenceMode, setIntelligenceMode] = useState<"global" | "workspace">("global");

  const activeNicheId = selectedNicheId || workspaces?.[0]?.nicheId || availableNiches?.[0]?.id;
  const selectedWorkspace = workspaces?.find((w: any) => w.nicheId === activeNicheId) || workspaces?.[0];

  const { data: snapshotData, isLoading: isSnapshotLoading } = useQuery<any>({
    queryKey: ["/api/niches", activeNicheId, "snapshot"],
    enabled: !!activeNicheId && intelligenceMode === "global",
  });

  const { data: workspaceIntel, isLoading: isWorkspaceIntelLoading } = useQuery<any>({
    queryKey: ["/api/workspaces", selectedWorkspace?.id, "intelligence"],
    enabled: !!selectedWorkspace?.id && intelligenceMode === "workspace",
  });

  const activeData = intelligenceMode === "global" ? snapshotData : workspaceIntel;
  const scoring = activeData?.scoring;
  const selectedNiche = availableNiches?.find((n: any) => n.id === activeNicheId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({ name });
      setIsOpen(false);
      setName("");
      toast({ title: t.dashboard.createWorkspace, description: t.dashboard.workspaceDesc });
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    }
  };

  const createDialog = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-workspace">
          <Plus className="w-4 h-4 mr-2" />
          {t.dashboard.newWorkspace}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.dashboard.createWorkspace}</DialogTitle>
          <DialogDescription>{t.dashboard.workspaceDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">{t.dashboard.workspaceName}</label>
            <Input
              placeholder="e.g. Acme Corp Marketing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              data-testid="input-workspace-name"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={createMutation.isPending || !name.trim()}
            data-testid="button-create-workspace"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t.dashboard.createWorkspace}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-40 rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 rounded-md" />
            <Skeleton className="h-28 rounded-md" />
            <Skeleton className="h-28 rounded-md" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (workspaces?.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-16 border-dashed border-2 border-border rounded-md text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2" data-testid="text-no-workspaces-title">{t.dashboard.noWorkspacesTitle}</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6" data-testid="text-no-workspaces-desc">{t.dashboard.noWorkspacesDesc}</p>
          {createDialog}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">

        {availableNiches && availableNiches.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-primary">{t.dashboard.selectNiche}:</span>
            <Popover open={nicheOpen} onOpenChange={setNicheOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={nicheOpen}
                  className="min-w-[280px] justify-between border-primary/30 hover:border-primary hover:bg-primary/5 transition-colors"
                  data-testid="combobox-niche-trigger"
                >
                  <span className="truncate">
                    {selectedNiche
                      ? selectedNiche.name.replace(/_/g, " ")
                      : t.dashboard.selectNiche}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <Command>
                  <CommandInput placeholder={t.dashboard.searchNiche} data-testid="input-niche-search" />
                  <CommandList>
                    <CommandEmpty data-testid="text-no-niche-found">{t.dashboard.noNicheFound}</CommandEmpty>
                    <CommandGroup>
                      {availableNiches.map((n: any) => (
                        <CommandItem
                          key={n.id}
                          value={n.name}
                          onSelect={() => {
                            setSelectedNicheId(n.id);
                            setNicheOpen(false);
                          }}
                          data-testid={`combobox-niche-item-${n.id}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              n.id === activeNicheId ? "opacity-100 text-primary" : "opacity-0"
                            )}
                          />
                          {n.name.replace(/_/g, " ")}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {selectedWorkspace && (
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit" data-testid="toggle-intelligence-mode">
            <button
              onClick={() => setIntelligenceMode("global")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                intelligenceMode === "global"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              )}
              data-testid="button-global-signal"
            >
              {t.dashboard.globalSignal}
            </button>
            <button
              onClick={() => setIntelligenceMode("workspace")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                intelligenceMode === "workspace"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              )}
              data-testid="button-your-dataset"
            >
              {t.dashboard.yourDataset}
            </button>
          </div>
        )}

        {intelligenceMode === "workspace" && scoring && scoring.totalVideos === 0 ? (
          <Card data-testid="card-workspace-empty">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <Brain className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-workspace-empty-title">{t.dashboard.workspaceEmpty}</h3>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <StatItem label={t.dashboard.confidence} value="0%" />
                <StatItem label={t.dashboard.signalStrength} value="0%" />
              </div>
            </CardContent>
          </Card>
        ) : activeData?.notReady || (scoring && scoring.totalVideos < 3) ? (
          <Card data-testid="card-empty-state">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <Brain className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-empty-state-title">{t.dashboard.emptyStateTitle}</h3>
              <p className="text-sm text-muted-foreground" data-testid="text-empty-state-desc">{t.dashboard.emptyStateDesc}</p>
            </CardContent>
          </Card>
        ) : scoring ? (
          <>
            <Card data-testid="card-niche-intelligence">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">{t.dashboard.nicheIntelligence}</span>
                  </div>
                  {selectedNiche && (
                    <span className="text-sm font-semibold text-foreground" data-testid="text-niche-name">
                      {selectedNiche.name.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge status={scoring.intelligenceStatus || "Building"} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatItem
                    label={t.dashboard.confidence}
                    value={`${scoring.confidencePercent ?? 0}%`}
                    tooltip={t.dashboard.confidenceTooltip}
                  />
                  <StatItem
                    label={t.dashboard.signalStrength}
                    value={`${scoring.signalStrengthPercent ?? 0}%`}
                    tooltip={t.dashboard.signalStrengthTooltip}
                  />
                  <StatItem
                    label={t.dashboard.videosAnalyzed}
                    value={scoring.totalVideos ?? 0}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">{t.dashboard.quickSnapshot}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SnapshotCard
                  title={t.dashboard.dominantHooks}
                  items={scoring.topHooks || []}
                  icon={Zap}
                />
                <SnapshotCard
                  title={t.dashboard.dominantFormats}
                  items={scoring.topFormats || []}
                  icon={BarChart3}
                />
                <SnapshotCard
                  title={t.dashboard.dominantAngles}
                  items={scoring.topAngles || []}
                  icon={Target}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => setLocation("/niche-data")}
              data-testid="button-view-data-breakdown"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t.dashboard.viewDataBreakdown}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        ) : selectedNiche && !selectedNiche.isReady ? (
          <Card data-testid="card-niche-not-ready">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <Brain className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground" data-testid="text-niche-not-ready">{t.dashboard.nicheNotReady}</p>
            </CardContent>
          </Card>
        ) : (
          <Card data-testid="card-no-niche">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <Brain className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-no-niche">{t.dashboard.noNicheSelected}</h3>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}