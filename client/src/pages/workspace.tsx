import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import type { ContentProject, SavedIdea } from "@shared/schema";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
  Plus,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Lightbulb,
  Bookmark,
  Compass,
  TrendingUp,
  Eye,
  X,
  Sparkles,
  LayoutTemplate,
  ArrowRight,
  Zap,
  Tag,
  Layers,
} from "lucide-react";

type ProjectStatus = "draft" | "in_progress" | "completed";

interface ViralTemplate {
  id: string;
  title: string;
  description: string | null;
  topicCluster: string | null;
  hookMechanism: string | null;
  structureType: string | null;
  hookTemplate: string | null;
  sceneStructure: any;
  source: string;
  usageCount: number;
  createdAt: string;
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

function formatTopic(topic: string | null | undefined) {
  if (!topic) return "—";
  return TOPIC_CLUSTER_LABELS[topic] || topic.replace(/_/g, " ");
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-violet-500 dark:text-violet-400";
  if (score >= 60) return "text-orange-500 dark:text-orange-400";
  return "text-yellow-500 dark:text-yellow-400";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "outline" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "outline";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: ContentProject;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const hasScript = project.script && Object.keys(project.script as object).length > 0;
  const hasBlueprint = project.blueprint && Object.keys(project.blueprint as object).length > 0;

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all"
      data-testid={`card-project-${project.projectId}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-foreground truncate"
              data-testid={`text-project-title-${project.projectId}`}
            >
              {project.title || project.hook || t.projects.untitled}
            </h3>
            {project.topic && (
              <p className="text-sm text-muted-foreground mt-0.5" data-testid={`text-project-topic-${project.projectId}`}>
                {project.topic}
              </p>
            )}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        {project.hook && (
          <div className="flex items-center gap-3 mb-3 text-sm text-muted-foreground">
            <p className="line-clamp-2 text-sm text-muted-foreground italic" data-testid={`text-project-hook-${project.projectId}`}>
              "{project.hook}"
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span data-testid={`text-script-status-${project.projectId}`}>
              {hasScript ? t.projects.scriptReady : t.projects.noScript}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Video className="w-3.5 h-3.5" />
            <span data-testid={`text-blueprint-status-${project.projectId}`}>
              {hasBlueprint ? t.projects.blueprintReady : t.projects.noBlueprint}
            </span>
          </div>
          {project.format && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-format-${project.projectId}`}>
              {project.format}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground" data-testid={`text-project-date-${project.projectId}`}>
            {new Date(project.createdAt).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              data-testid={`button-open-project-${project.projectId}`}
            >
              {t.projects.open}
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              data-testid={`button-delete-project-${project.projectId}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectDetail({
  project,
  open,
  onClose,
}: {
  project: ContentProject;
  open: boolean;
  onClose: () => void;
}) {
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

  function handleSave() {
    updateMutation.mutate({ title, hook, format, topic, status });
  }

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
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.projects.titlePlaceholder}
                data-testid="input-project-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t.projects.statusLabel}</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger data-testid="select-project-status">
                  <SelectValue />
                </SelectTrigger>
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
            <Textarea
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder={t.projects.hookPlaceholder}
              className="resize-none"
              rows={2}
              data-testid="input-project-hook"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t.projects.formatLabel}</label>
              <Input
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder={t.projects.formatPlaceholder}
                data-testid="input-project-format"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{t.projects.topicLabel}</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.projects.topicPlaceholder}
                data-testid="input-project-topic"
              />
            </div>
          </div>

          {script && Object.keys(script).length > 0 && (
            <Card data-testid="section-project-script">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    {t.projects.scriptSection}
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/script-generator?projectId=${project.projectId}`)}
                    data-testid="button-edit-script"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    {t.projects.editScript}
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  {script.hook && (
                    <div>
                      <span className="font-medium text-muted-foreground">{t.projects.hookLabel}:</span>
                      <p className="text-foreground mt-0.5">{script.hook}</p>
                    </div>
                  )}
                  {script.structure && (
                    <div>
                      <span className="font-medium text-muted-foreground">{t.projects.structureLabel}:</span>
                      <p className="text-foreground mt-0.5">{script.structure}</p>
                    </div>
                  )}
                  {script.script && (
                    <div>
                      <span className="font-medium text-muted-foreground">{t.projects.fullScript}:</span>
                      <p className="text-foreground mt-0.5 whitespace-pre-wrap">{script.script}</p>
                    </div>
                  )}
                  {script.cta && (
                    <div>
                      <span className="font-medium text-muted-foreground">{t.projects.ctaLabel}:</span>
                      <p className="text-foreground mt-0.5">{script.cta}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {blueprint && blueprint.scenes && blueprint.scenes.length > 0 && (
            <Card data-testid="section-project-blueprint">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <Video className="w-4 h-4" />
                    {t.projects.blueprintSection}
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/video-builder?projectId=${project.projectId}`)}
                    data-testid="button-edit-blueprint"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    {t.projects.editBlueprint}
                  </Button>
                </div>
                <div className="space-y-3 text-sm">
                  {blueprint.hook && (
                    <div>
                      <span className="font-medium text-muted-foreground">{t.projects.hookLabel}:</span>
                      <p className="text-foreground mt-0.5">{blueprint.hook}</p>
                    </div>
                  )}
                  {blueprint.scenes.map((scene, i) => (
                    <div key={i} className="border-l-2 border-muted pl-3">
                      <span className="font-medium text-muted-foreground">{t.projects.sceneLabel} {i + 1}</span>
                      {scene.description && <p className="text-foreground mt-0.5">{scene.description}</p>}
                      {scene.visual_suggestion && (
                        <p className="text-muted-foreground text-xs mt-0.5">{scene.visual_suggestion}</p>
                      )}
                    </div>
                  ))}
                  {blueprint.cta && (
                    <div>
                      <span className="font-medium text-muted-foreground">{t.projects.ctaLabel}:</span>
                      <p className="text-foreground mt-0.5">{blueprint.cta}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setLocation(`/script-generator?hook=${encodeURIComponent(hook)}&format=${encodeURIComponent(format)}&topic=${encodeURIComponent(topic)}`)}
                data-testid="button-create-script"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                {t.projects.createScript}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation(`/video-builder?hook=${encodeURIComponent(hook)}&format=${encodeURIComponent(format)}&topic=${encodeURIComponent(topic)}`)}
                data-testid="button-create-video"
              >
                <Video className="w-4 h-4 mr-1.5" />
                {t.projects.createVideo}
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" onClick={onClose} data-testid="button-close-detail">
                {t.common.cancel}
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save-project"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : null}
                {t.common.save}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProjectsTab() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<ContentProject | null>(null);

  const { data: projects, isLoading } = useQuery<ContentProject[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: t.projects.deleteSuccess });
    },
    onError: () => {
      toast({ title: t.projects.deleteError, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/projects", { title: t.projects.newProject, status: "draft" });
      return res.json();
    },
    onSuccess: (project: ContentProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedProject(project);
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const allProjects = projects || [];

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          data-testid="button-new-project"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1.5" />
          )}
          {t.projects.newProject}
        </Button>
      </div>

      {allProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium mb-1" data-testid="text-no-projects">
            {t.projects.noProjects}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {t.projects.noProjectsHint}
          </p>
          <Button onClick={() => createMutation.mutate()} data-testid="button-create-first-project">
            <Plus className="w-4 h-4 mr-1.5" />
            {t.projects.newProject}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProjects.map((project) => (
            <ProjectCard
              key={project.projectId}
              project={project}
              onOpen={() => setSelectedProject(project)}
              onDelete={() => deleteMutation.mutate(project.projectId)}
            />
          ))}
        </div>
      )}

      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          open={!!selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </>
  );
}

function SavedIdeasTab() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: savedIdeas, isLoading } = useQuery<SavedIdea[]>({
    queryKey: ["/api/ideas"],
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", "/api/ideas/dismiss", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({ title: "Idea dismissed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to dismiss idea.", variant: "destructive" });
    },
  });

  function navigateToScript(hook: string, format?: string | null, topic?: string | null) {
    const params = new URLSearchParams();
    params.set("hook", hook);
    if (format) params.set("format", format);
    if (topic) params.set("topic", topic);
    setLocation(`/script-generator?${params.toString()}`);
  }

  function navigateToVideo(hook: string, format?: string | null, topic?: string | null) {
    const params = new URLSearchParams();
    params.set("hook", hook);
    if (format) params.set("format", format);
    if (topic) params.set("topic", topic);
    setLocation(`/video-builder?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-md" />
        ))}
      </div>
    );
  }

  const activeSavedIdeas = (savedIdeas || []).filter((i) => i.status === "saved");

  if (activeSavedIdeas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Bookmark className="w-7 h-7 text-primary/40" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-no-saved-title">
          No saved ideas yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-md" data-testid="text-no-saved-desc">
          Save interesting opportunities from the Discover page to build your idea collection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-saved-ideas">
      {activeSavedIdeas.map((idea) => {
        const score = idea.opportunityScore || 0;
        return (
          <Card key={idea.id} data-testid={`card-idea-${idea.id}`}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground line-clamp-2" data-testid={`text-idea-hook-${idea.id}`}>
                    {idea.hook}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {idea.format && (
                      <Badge variant="outline" className="text-[10px]">
                        {idea.format.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {idea.topic && (
                      <Badge variant="secondary" className="text-[10px]">
                        {formatTopic(idea.topic)}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      <Bookmark className="w-2.5 h-2.5 mr-0.5" />
                      Saved
                    </Badge>
                  </div>
                </div>
                {score > 0 && (
                  <div className="flex-shrink-0 text-center">
                    <p className={`text-2xl font-bold ${getScoreColor(score)}`} data-testid={`text-idea-score-${idea.id}`}>
                      {score}
                    </p>
                    <Badge variant={getScoreBadgeVariant(score)} className="text-[9px] mt-1">
                      {getScoreLabel(score)}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {idea.velocity != null && idea.velocity > 0 && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {idea.velocity.toFixed(1)} vel.
                  </span>
                )}
                {idea.videosDetected != null && idea.videosDetected > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {idea.videosDetected} videos
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => navigateToScript(idea.hook, idea.format, idea.topic)} data-testid={`button-idea-script-${idea.id}`}>
                  <FileText className="w-3 h-3 mr-1" />
                  Script
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => navigateToVideo(idea.hook, idea.format, idea.topic)} data-testid={`button-idea-video-${idea.id}`}>
                  <Video className="w-3 h-3 mr-1" />
                  Video
                </Button>
                <Button variant="ghost" size="icon" onClick={() => dismissMutation.mutate(idea.id)} disabled={dismissMutation.isPending} data-testid={`button-idea-dismiss-${idea.id}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TemplatesTab() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: templates, isLoading } = useQuery<ViralTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/templates/generate"),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: data.created > 0
          ? t.viralTemplates.generatedSuccess.replace("{count}", String(data.created))
          : t.viralTemplates.generatedNone,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: t.viralTemplates.deleteSuccess });
    },
  });

  const useMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/templates/${id}/use`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
  });

  const handleUseTemplate = (tmpl: ViralTemplate) => {
    useMut.mutate(tmpl.id);
    const params = new URLSearchParams();
    if (tmpl.hookTemplate) params.set("hook", tmpl.hookTemplate);
    if (tmpl.topicCluster) params.set("topic", tmpl.topicCluster);
    if (tmpl.structureType) params.set("format", tmpl.structureType.replace(/_/g, " "));
    setLocation(`/script-generator?${params.toString()}`);
  };

  const isAdmin = (user as any)?.isAdmin === true;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4 gap-2">
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          variant="outline"
          data-testid="button-generate-templates"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {generateMutation.isPending ? t.viralTemplates.generating : t.viralTemplates.generate}
        </Button>
      </div>

      {!templates || templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <LayoutTemplate className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">{t.viralTemplates.noTemplates}</p>
          <p className="text-sm text-muted-foreground/70 mt-1">{t.viralTemplates.noTemplatesHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <Card key={tmpl.id} data-testid={`card-template-${tmpl.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{tmpl.title}</CardTitle>
                  <Badge variant={tmpl.source === "auto" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                    {tmpl.source === "auto" ? t.viralTemplates.autoGenerated : t.viralTemplates.manualCreated}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {tmpl.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {tmpl.topicCluster && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Tag className="w-3 h-3" />
                      {TOPIC_CLUSTER_LABELS[tmpl.topicCluster as keyof typeof TOPIC_CLUSTER_LABELS] || tmpl.topicCluster}
                    </Badge>
                  )}
                  {tmpl.hookMechanism && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Zap className="w-3 h-3" />
                      {tmpl.hookMechanism.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {tmpl.structureType && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Layers className="w-3 h-3" />
                      {tmpl.structureType.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                {tmpl.hookTemplate && (
                  <p className="text-xs italic text-foreground/80 bg-muted/30 p-2 rounded">"{tmpl.hookTemplate}"</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground">
                    {t.viralTemplates.usedTimes.replace("{count}", String(tmpl.usageCount))}
                  </span>
                  <div className="flex gap-1.5">
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive"
                        onClick={() => deleteMutation.mutate(tmpl.id)}
                        data-testid={`button-delete-template-${tmpl.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => handleUseTemplate(tmpl)}
                      data-testid={`button-use-template-${tmpl.id}`}
                    >
                      {t.viralTemplates.useTemplate}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default function WorkspacePage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("projects");

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto" data-testid="page-workspace">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-workspace-title">
              {t.workspace.title}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm" data-testid="text-workspace-subtitle">
            {t.workspace.subtitle}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-workspace">
            <TabsTrigger value="projects" data-testid="tab-projects">
              <FolderOpen className="w-4 h-4 mr-1.5" />
              {t.workspace.tabProjects}
            </TabsTrigger>
            <TabsTrigger value="ideas" data-testid="tab-ideas">
              <Lightbulb className="w-4 h-4 mr-1.5" />
              {t.workspace.tabIdeas}
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">
              <LayoutTemplate className="w-4 h-4 mr-1.5" />
              {t.workspace.tabTemplates}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-4">
            <ProjectsTab />
          </TabsContent>

          <TabsContent value="ideas" className="mt-4">
            <SavedIdeasTab />
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <TemplatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
