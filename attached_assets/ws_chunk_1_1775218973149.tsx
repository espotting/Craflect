import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import type { ContentProject, SavedIdea } from "@shared/schema";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderKanban,
  FolderOpen,
  FileText,
  Video,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Lightbulb,
  Bookmark,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { getViralityColor } from "@/lib/predicted-views";

type ProjectStatus = "draft" | "in_progress" | "completed";

// Construit l'URL Studio avec contexte complet
function buildStudioUrl(params: {
  hook?: string | null;
  format?: string | null;
  topic?: string | null;
  opportunityScore?: number | null;
}): string {
  const p = new URLSearchParams();
  if (params.hook) p.set("hook", params.hook);
  if (params.format) p.set("format", params.format);
  if (params.topic) p.set("topic", params.topic);
  if (params.opportunityScore) p.set("viralityScore", String(params.opportunityScore));
  return `/create?${p.toString()}`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "completed":
      return { label: "Completed", variant: "default" as const, icon: CheckCircle2, className: "bg-green-600 text-white border-green-700" };
    case "in_progress":
      return { label: "In Progress", variant: "default" as const, icon: Loader2, className: "bg-yellow-500 text-white border-yellow-600" };
    default:
      return { label: "Draft", variant: "secondary" as const, icon: Clock, className: "" };
  }
}

function ProjectStatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={config.className} data-testid={`badge-status-${status}`}>
      <Icon className={`w-3 h-3 mr-1 ${status === "in_progress" ? "animate-spin" : ""}`} />
      {config.label}
    </Badge>
  );
}

function ViralityScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined || score <= 0) return null;
  const colorClass = getViralityColor(score);
  return (
    <div className="flex-shrink-0 text-center">
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${colorClass}`}>
        <TrendingUp className="w-3 h-3" />
        {score}
      </div>
    </div>
  );
}

function IdeaCard({
  hook, format, score, date, actions, testIdPrefix,
}: {
  hook: string | null | undefined;
  format: string | null | undefined;
  score: number | null | undefined;
  date: string | Date;
  actions: React.ReactNode;
  testIdPrefix: string;
}) {
  return (
    <Card className="hover-elevate transition-all" data-testid={testIdPrefix}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {hook && (
              <p className="text-sm text-foreground italic line-clamp-2" data-testid={`${testIdPrefix}-hook`}>
                "{hook}"
              </p>
            )}
          </div>
          <ViralityScoreBadge score={typeof score === "number" ? score : null} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {format && (
            <Badge variant="outline" className="text-xs" data-testid={`${testIdPrefix}-format`}>
              {format.replace(/_/g, " ")}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground" data-testid={`${testIdPrefix}-date`}>
            {new Date(date).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border/50 flex-wrap">
          {actions}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectDetail({ project, open, onClose }: { project: ContentProject; open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState(project.title || "");
  const [hook, setHook] = useState(project.hook || "");
  const [format, setFormat] = useState(project.format || "");
  const [topic, setTopic] = useState(project.topic || "");
  const [status, setStatus] = useState<ProjectStatus>(project.status as ProjectStatus);

  const script = project.script as Record<string, string> | null;
  const blueprint = project.blueprint as { hook?: string; scenes?: Array<{ description?: string; visual_suggestion?: string; script_lines?: string }>; cta?: string } | null;

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/projects/${project.projectId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: t.projects.savedSuccess });
    },
    onError: () => {
      toast({ title: t.projects.saveError, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-project-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            {title || t.projects.untitled}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t.projects.titleLabel}</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.projects.titlePlaceholder} data-testid="input-project-title" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t.projects.statusLabel}</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger data-testid="select-project-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t.projects.draft}</SelectItem>
                  <SelectItem value="in_progress">{t.projects.inProgress}</SelectItem>
                  <SelectItem value="completed">{t.projects.completed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t.projects.hookLabel}</label>
            <Textarea value={hook} onChange={(e) => setHook(e.target.value)} placeholder={t.projects.hookPlaceholder} className="resize-none" rows={2} data-testid="input-project-hook" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t.projects.formatLabel}</label>
              <Input value={format} onChange={(e) => setFormat(e.target.value)} placeholder={t.projects.formatPlaceholder} data-testid="input-project-format" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t.projects.topicLabel}</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t.projects.topicPlaceholder} data-testid="input-project-topic" />
            </div>
          </div>

          {script && Object.keys(script).length > 0 && (
            <Card data-testid="section-project-script">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />{t.projects.scriptSection}
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setLocation(buildStudioUrl({ hook, format, topic }))} data-testid="button-edit-script">
                    <Pencil className="w-3.5 h-3.5 mr-1" />{t.projects.editScript}
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  {script.hook_line && <div><span className="font-medium text-muted-foreground">{t.projects.hookLabel}:</span><p className="text-foreground mt-0.5">{script.hook_line}</p></div>}
                  {script.cta && <div><span className="font-medium text-muted-foreground">{t.projects.ctaLabel}:</span><p className="text-foreground mt-0.5">{script.cta}</p></div>}
                </div>
              </CardContent>
            </Card>
          )}

          {blueprint && blueprint.scenes && blueprint.scenes.length > 0 && (
            <Card data-testid="section-project-blueprint">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <Video className="w-4 h-4" />{t.projects.blueprintSection}
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setLocation(buildStudioUrl({ hook, format, topic }))} data-testid="button-edit-blueprint">
                    <Pencil className="w-3.5 h-3.5 mr-1" />{t.projects.editBlueprint}
                  </Button>
                </div>
                <div className="space-y-3 text-sm">
                  {blueprint.scenes.map((scene, i) => (
                    <div key={i} className="border-l-2 border-muted pl-3">
                      <span className="font-medium text-muted-foreground">{t.projects.sceneLabel} {i + 1}</span>
                      {scene.description && <p className="text-foreground mt-0.5">{scene.description}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
            <Button variant="outline" onClick={() => setLocation(buildStudioUrl({ hook, format, topic }))} data-testid="button-continue-create">
              <ArrowRight className="w-4 h-4 mr-1.5" />
              Continue in Studio
            </Button>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" onClick={onClose} data-testid="button-close-detail">{t.common.cancel}</Button>
              <Button onClick={() => updateMutation.mutate({ title, hook, format, topic, status })} disabled={updateMutation.isPending} data-testid="button-save-project">
