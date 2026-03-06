import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutTemplate,
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  Zap,
  Tag,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

export default function ViralTemplates() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newHookTemplate, setNewHookTemplate] = useState("");

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

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/templates", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: t.viralTemplates.createSuccess });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
      setNewHookTemplate("");
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

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <LayoutTemplate className="w-6 h-6 text-primary" />
              {t.viralTemplates.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t.viralTemplates.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              variant="outline"
              data-testid="button-generate-templates"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generateMutation.isPending ? t.viralTemplates.generating : t.viralTemplates.generate}
            </Button>
            {isAdmin && (
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-template">
                    <Plus className="w-4 h-4 mr-2" />
                    {t.viralTemplates.addManual}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.viralTemplates.addManual}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 mt-2">
                    <div>
                      <Label>{t.viralTemplates.titleLabel}</Label>
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder={t.viralTemplates.titlePlaceholder}
                        data-testid="input-template-title"
                      />
                    </div>
                    <div>
                      <Label>{t.viralTemplates.descriptionLabel}</Label>
                      <Textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder={t.viralTemplates.descriptionPlaceholder}
                        data-testid="input-template-description"
                      />
                    </div>
                    <div>
                      <Label>{t.viralTemplates.hookMechanism}</Label>
                      <Textarea
                        value={newHookTemplate}
                        onChange={(e) => setNewHookTemplate(e.target.value)}
                        placeholder={t.viralTemplates.hookTemplatePlaceholder}
                        data-testid="input-template-hook"
                      />
                    </div>
                    <Button
                      onClick={() => createMutation.mutate({ title: newTitle, description: newDescription || undefined, hookTemplate: newHookTemplate || undefined })}
                      disabled={!newTitle || createMutation.isPending}
                      data-testid="button-submit-template"
                    >
                      {t.viralTemplates.addManual}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : !templates || templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <LayoutTemplate className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{t.viralTemplates.noTemplates}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{t.viralTemplates.noTemplatesHint}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <Card key={tmpl.id} className="hover:shadow-md transition-shadow" data-testid={`card-template-${tmpl.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
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
                          className="h-7 text-xs text-destructive"
                          onClick={() => deleteMutation.mutate(tmpl.id)}
                          data-testid={`button-delete-template-${tmpl.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
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
      </div>
    </DashboardLayout>
  );
}
