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
  Sparkles,
  Layers,
  Settings,
  X,
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
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                {t.common.save}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}><CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" /><Skeleton className="h-8 w-24" />
        </CardContent></Card>
      ))}
    </div>
  );
}

function GeneratedIdeasTab() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: projects, isLoading } = useQuery<ContentProject[]>({ queryKey: ["/api/projects"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/projects/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); toast({ title: t.projects.deleteSuccess }); },
    onError: () => { toast({ title: t.projects.deleteError, variant: "destructive" }); },
  });

  if (isLoading) return <LoadingSkeleton />;

  const ideas = (projects || []).filter((p) => {
    const script = p.script as Record<string, unknown> | null;
    return !script || Object.keys(script).length === 0;
  });

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Lightbulb className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium mb-1" data-testid="text-no-generated-ideas">{t.workspace.noGeneratedIdeas}</p>
        <p className="text-sm text-muted-foreground mb-4">{t.workspace.noGeneratedIdeasHint}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-generated-ideas">
      {ideas.map((project) => (
        <IdeaCard
          key={project.projectId}
          hook={project.hook} format={project.format}
          score={(project as any).opportunity_score ?? null}
          date={project.createdAt}
          testIdPrefix={`card-generated-idea-${project.projectId}`}
          actions={
            <>
              <Button variant="outline" size="sm" className="flex-1 text-xs"
                onClick={() => setLocation(buildStudioUrl({ hook: project.hook, format: project.format, topic: project.topic, opportunityScore: (project as any).opportunity_score }))}
                data-testid={`button-continue-idea-${project.projectId}`}
              >
                <ArrowRight className="w-3 h-3 mr-1" />Continue in Studio
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(project.projectId)} disabled={deleteMutation.isPending} data-testid={`button-delete-idea-${project.projectId}`}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </>
          }
        />
      ))}
    </div>
  );
}

function CreatedScriptsTab() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedProject, setSelectedProject] = useState<ContentProject | null>(null);

  const { data: projects, isLoading } = useQuery<ContentProject[]>({ queryKey: ["/api/projects"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/projects/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); toast({ title: t.projects.deleteSuccess }); },
    onError: () => { toast({ title: t.projects.deleteError, variant: "destructive" }); },
  });

  if (isLoading) return <LoadingSkeleton />;

  const scripts = (projects || []).filter((p) => {
    const script = p.script as Record<string, unknown> | null;
    return script && Object.keys(script).length > 0;
  });

  if (scripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium mb-1" data-testid="text-no-created-scripts">{t.workspace.noCreatedScripts}</p>
        <p className="text-sm text-muted-foreground mb-4">{t.workspace.noCreatedScriptsHint}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-created-scripts">
        {scripts.map((project) => {
          const hasBlueprint = !!(project.blueprint && Object.keys(project.blueprint as object).length > 0);
          return (
            <Card key={project.projectId} className="hover-elevate transition-all" data-testid={`card-script-${project.projectId}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate text-sm" data-testid={`text-script-title-${project.projectId}`}>
                      {project.title || project.hook || t.projects.untitled}
                    </h3>
                    {project.hook && (
                      <p className="text-sm text-muted-foreground italic line-clamp-2 mt-1" data-testid={`text-script-hook-${project.projectId}`}>
                        "{project.hook}"
                      </p>
                    )}
                  </div>
                  <ViralityScoreBadge score={(project as any).opportunity_score ?? null} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {project.format && <Badge variant="outline" className="text-xs">{project.format.replace(/_/g, " ")}</Badge>}
                  <Badge variant="secondary" className="text-xs"><FileText className="w-3 h-3 mr-0.5" />{t.projects.scriptReady}</Badge>
                  {hasBlueprint && <Badge variant="secondary" className="text-xs"><Video className="w-3 h-3 mr-0.5" />{t.projects.blueprintReady}</Badge>}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border/50 flex-wrap">
                  <span className="text-xs text-muted-foreground">{new Date(project.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedProject(project)} data-testid={`button-open-script-${project.projectId}`}>
                      {t.projects.open}<ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => setLocation(buildStudioUrl({ hook: project.hook, format: project.format, topic: project.topic, opportunityScore: (project as any).opportunity_score }))}
                      data-testid={`button-continue-script-${project.projectId}`}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />Studio
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(project.projectId)} disabled={deleteMutation.isPending} data-testid={`button-delete-script-${project.projectId}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {selectedProject && <ProjectDetail project={selectedProject} open={!!selectedProject} onClose={() => setSelectedProject(null)} />}
    </>
  );
}

function SavedInspirationsTab() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: savedIdeas, isLoading } = useQuery<SavedIdea[]>({ queryKey: ["/api/ideas"] });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("POST", "/api/ideas/dismiss", { id }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ideas"] }); toast({ title: t.workspace.ideaDismissed }); },
    onError: () => { toast({ title: t.common.error, variant: "destructive" }); },
  });

  if (isLoading) return <LoadingSkeleton />;

  const activeIdeas = (savedIdeas || []).filter((i) => i.status === "saved");

  if (activeIdeas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Bookmark className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium mb-1" data-testid="text-no-inspirations">{t.workspace.noInspirations}</p>
        <p className="text-sm text-muted-foreground mb-4" data-testid="text-no-inspirations-hint">{t.workspace.noInspirationsHint}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-saved-inspirations">
      {activeIdeas.map((idea) => (
        <IdeaCard
          key={idea.id}
          hook={idea.hook} format={idea.format}
          score={idea.opportunityScore}
          date={idea.createdAt}
          testIdPrefix={`card-inspiration-${idea.id}`}
          actions={
            <>
              <Button variant="outline" size="sm" className="flex-1 text-xs"
                onClick={() => setLocation(buildStudioUrl({ hook: idea.hook, format: idea.format, topic: idea.topic, opportunityScore: idea.opportunityScore }))}
                data-testid={`button-create-from-inspiration-${idea.id}`}
              >
                <ArrowRight className="w-3 h-3 mr-1" />Continue in Studio
              </Button>
              <Button variant="ghost" size="icon" onClick={() => dismissMutation.mutate(idea.id)} disabled={dismissMutation.isPending} data-testid={`button-delete-inspiration-${idea.id}`}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </>
          }
        />
      ))}
    </div>
  );
}

// ─── Saved Patterns Tab ───────────────────────────────────────────────────────

interface SavedPattern {
  pattern_id: string;
  pattern_label: string | null;
  hook_template: string | null;
  why_it_works: string | null;
  avg_virality_score: number | null;
  topic_cluster: string | null;
  hook_type: string | null;
  trend_status: string | null;
  velocity_7d: number | null;
}

function viralityBarColor(score: number): string {
  if (score >= 80) return 'linear-gradient(90deg, #7C5CFF, #c026d3)';
  if (score >= 60) return '#7C5CFF';
  if (score >= 40) return '#3b82f6';
  return '#64748b';
}

function SavedPatternsTab() {
  const [, setLocation] = useLocation();
  const { data: patterns, isLoading } = useQuery<SavedPattern[]>({ queryKey: ["/api/patterns/saved"] });

  if (isLoading) return <LoadingSkeleton />;

  if (!patterns || patterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Layers className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium mb-1">No patterns found</p>
        <p className="text-sm text-muted-foreground">Add niches in My Niches to see relevant patterns here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-saved-patterns">
      {patterns.map((pattern) => {
        const score = Math.round(pattern.avg_virality_score || 0);
        return (
          <Card key={pattern.pattern_id} className="hover-elevate transition-all" data-testid={`card-pattern-${pattern.pattern_id}`}>
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-foreground line-clamp-2 flex-1">
                  {pattern.pattern_label || pattern.hook_type || "Pattern"}
                </h3>
                <div className="flex gap-1 shrink-0">
                  {pattern.trend_status === 'emerging' && (
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid #ef4444' }}>
                      🔥 Emerging
                    </span>
                  )}
                  {pattern.trend_status === 'trending' && (
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(124,92,255,0.15)', color: '#7C5CFF', border: '1px solid #7C5CFF' }}>
                      ⚡ Trending
                    </span>
                  )}
                </div>
              </div>

              {/* Hook template */}
              {pattern.hook_template && (
                <div style={{
                  background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)',
                  borderRadius: 8, padding: '8px 10px',
                  fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5,
                }}>
                  {pattern.hook_template}
                </div>
              )}

              {/* Why it works */}
              {pattern.why_it_works && (
                <p className="text-xs text-muted-foreground line-clamp-2">{pattern.why_it_works}</p>
              )}

              {/* Virality bar */}
              {score > 0 && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Virality</span>
                    <span className="text-xs font-semibold" style={{ color: '#7C5CFF' }}>{score}/100</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${score}%`, height: '100%', borderRadius: 2,
                      background: viralityBarColor(score), transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => setLocation(`/create?patternId=${pattern.pattern_id}`)}
                  data-testid={`button-use-pattern-${pattern.pattern_id}`}
                >
                  <Sparkles className="w-3 h-3 mr-1" />Use in Studio
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── My Niches Tab ────────────────────────────────────────────────────────────

const AVAILABLE_NICHES = [
  'fitness', 'finance', 'beauty', 'food', 'travel', 'tech', 'gaming',
  'education', 'business', 'lifestyle', 'fashion', 'health', 'music',
  'comedy', 'sports', 'motivation', 'cooking', 'diy', 'pets', 'parenting',
];

function MyNichesTab() {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editPrimary, setEditPrimary] = useState<string | null>(null);
  const [editSelected, setEditSelected] = useState<string[]>([]);

  const { data: prefs, isLoading } = useQuery<{
    selectedNiches: string[];
    primaryNiche: string | null;
  }>({ queryKey: ["/api/user/preferences"] });

  const saveMutation = useMutation({
    mutationFn: async (data: { selectedNiches: string[]; primaryNiche: string | null }) =>
      apiRequest("PATCH", "/api/user/preferences", {
        selectedNiches: data.selectedNiches,
        primaryNiche: data.primaryNiche,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowModal(false);
      toast({ title: "Niches updated!" });
    },
    onError: () => toast({ title: "Could not save niches", variant: "destructive" }),
  });

  function openModal() {
    setEditPrimary(prefs?.primaryNiche || null);
    setEditSelected(prefs?.selectedNiches || []);
    setShowModal(true);
  }

  function toggleNiche(niche: string) {
    if (editPrimary === niche) {
      setEditPrimary(null);
      setEditSelected(prev => prev.filter(n => n !== niche));
    } else if (editSelected.includes(niche)) {
      setEditSelected(prev => prev.filter(n => n !== niche));
    } else if (editSelected.length < 3) {
      setEditSelected(prev => [...prev, niche]);
    }
  }

  function setPrimaryNiche(niche: string) {
    if (!editSelected.includes(niche)) {
      if (editSelected.length < 3) {
        setEditSelected(prev => [...prev, niche]);
      }
    }
    setEditPrimary(niche);
  }

  if (isLoading) return <LoadingSkeleton />;

  const selectedNiches = prefs?.selectedNiches || [];
  const primaryNiche = prefs?.primaryNiche || null;

  return (
    <div data-testid="tab-my-niches">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Your Content Niches</h3>
          <p className="text-sm text-muted-foreground mt-1">
            These define which trends and patterns Craflect shows you.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openModal} data-testid="button-edit-niches">
          <Settings className="w-3.5 h-3.5 mr-1.5" />Edit Niches
        </Button>
      </div>

      {selectedNiches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Lightbulb className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">No niches selected</p>
          <p className="text-sm text-muted-foreground mb-4">Add niches to personalize your experience.</p>
          <Button onClick={openModal}>Add Niches</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {primaryNiche && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Primary Niche</p>
              <span style={{
                display: 'inline-block', padding: '8px 20px', borderRadius: 20,
                background: 'rgba(124,92,255,0.2)', border: '2px solid #7C5CFF',
                color: '#7C5CFF', fontSize: 15, fontWeight: 700,
                textTransform: 'capitalize',
              }}>
                {primaryNiche.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          {selectedNiches.filter(n => n !== primaryNiche).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Secondary Niches</p>
              <div className="flex flex-wrap gap-2">
                {selectedNiches.filter(n => n !== primaryNiche).map(niche => (
                  <span key={niche} style={{
                    display: 'inline-block', padding: '6px 14px', borderRadius: 16,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.7)', fontSize: 13, textTransform: 'capitalize',
                  }}>
                    {niche.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Niches Modal */}
      <Dialog open={showModal} onOpenChange={(v) => !v && setShowModal(false)}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-niches">
          <DialogHeader>
            <DialogTitle>Edit Your Niches</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Select up to 3 niches. Click once to add as secondary, click the ★ to set as primary.
            </p>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {AVAILABLE_NICHES.map(niche => {
                const isSelected = editSelected.includes(niche);
                const isPrimary = editPrimary === niche;
                return (
                  <div key={niche} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      onClick={() => toggleNiche(niche)}
                      style={{
                        padding: '6px 12px', borderRadius: 16, fontSize: 13, cursor: 'pointer',
                        fontWeight: isPrimary ? 700 : 500, textTransform: 'capitalize',
                        background: isPrimary ? 'rgba(124,92,255,0.2)' : isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                        border: isPrimary ? '2px solid #7C5CFF' : isSelected ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                        color: isPrimary ? '#7C5CFF' : isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {niche.replace(/_/g, ' ')}
                    </button>
                    {isSelected && !isPrimary && (
                      <button
                        onClick={() => setPrimaryNiche(niche)}
                        title="Set as primary"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: 0 }}
                      >★</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate({ selectedNiches: editSelected, primaryNiche: editPrimary })}
                disabled={saveMutation.isPending}
                data-testid="button-save-niches"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("generated-ideas");

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto" data-testid="page-workspace">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-workspace-title">{t.workspace.title}</h1>
          </div>
          <p className="text-muted-foreground text-sm" data-testid="text-workspace-subtitle">{t.workspace.subtitle}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-workspace">
            <TabsTrigger value="generated-ideas" data-testid="tab-generated-ideas">
              <Lightbulb className="w-4 h-4 mr-1.5" />{t.workspace.tabGeneratedIdeas}
            </TabsTrigger>
            <TabsTrigger value="created-scripts" data-testid="tab-created-scripts">
              <FileText className="w-4 h-4 mr-1.5" />{t.workspace.tabCreatedScripts}
            </TabsTrigger>
            <TabsTrigger value="saved-inspirations" data-testid="tab-saved-inspirations">
              <Bookmark className="w-4 h-4 mr-1.5" />{t.workspace.tabSavedInspirations}
            </TabsTrigger>
            <TabsTrigger value="saved-patterns" data-testid="tab-saved-patterns">
              <Layers className="w-4 h-4 mr-1.5" />Saved Patterns
            </TabsTrigger>
            <TabsTrigger value="my-niches" data-testid="tab-my-niches">
              <Settings className="w-4 h-4 mr-1.5" />My Niches
            </TabsTrigger>
          </TabsList>
          <TabsContent value="generated-ideas" className="mt-4"><GeneratedIdeasTab /></TabsContent>
          <TabsContent value="created-scripts" className="mt-4"><CreatedScriptsTab /></TabsContent>
          <TabsContent value="saved-inspirations" className="mt-4"><SavedInspirationsTab /></TabsContent>
          <TabsContent value="saved-patterns" className="mt-4"><SavedPatternsTab /></TabsContent>
          <TabsContent value="my-niches" className="mt-4"><MyNichesTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
