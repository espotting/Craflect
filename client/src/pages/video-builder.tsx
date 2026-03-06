import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Video, RefreshCw, Save, Sparkles, Eye, FileText, Megaphone, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface BlueprintHook {
  text: string;
  visual_suggestion: string;
}

interface BlueprintScene {
  title: string;
  description: string;
  visual_suggestion: string;
  script_lines: string;
}

interface BlueprintCTA {
  text: string;
  visual_suggestion: string;
}

interface Blueprint {
  hook: BlueprintHook;
  scenes: BlueprintScene[];
  cta: BlueprintCTA;
}

export default function VideoBuilder() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const initialHook = params.get("hook") || "";
  const initialFormat = params.get("format") || "";
  const initialTopic = params.get("topic") || "";
  const initialScript = params.get("script") || "";
  const hasParams = !!(initialHook || initialFormat || initialTopic || initialScript);

  const [hook, setHook] = useState(initialHook);
  const [format, setFormat] = useState(initialFormat);
  const [topic, setTopic] = useState(initialTopic);
  const [script, setScript] = useState(initialScript);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);

  useEffect(() => {
    if (initialHook && hasParams) {
      handleGenerate();
    }
  }, []);

  async function handleGenerate() {
    if (!hook.trim()) return;
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/generate/blueprint", {
        hook: hook.trim(),
        format: format.trim() || undefined,
        topic: topic.trim() || undefined,
        script: script.trim() || undefined,
      });
      const data = await res.json();
      setBlueprint(data);
    } catch {
      toast({
        title: "Error",
        description: t.videoBuilder.errorGenerate,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveToProject() {
    if (!blueprint) return;
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/projects", {
        title: hook.trim() || "Untitled Blueprint",
        hook: hook.trim(),
        format: format.trim() || null,
        topic: topic.trim() || null,
        blueprint,
        status: "draft",
      });
      toast({
        title: "Saved",
        description: t.videoBuilder.savedSuccess,
      });
      navigate("/projects");
    } catch {
      toast({
        title: "Error",
        description: t.videoBuilder.errorSave,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function updateBlueprintHook(field: keyof BlueprintHook, value: string) {
    if (!blueprint) return;
    setBlueprint({
      ...blueprint,
      hook: { ...blueprint.hook, [field]: value },
    });
  }

  function updateScene(index: number, field: keyof BlueprintScene, value: string) {
    if (!blueprint) return;
    const scenes = [...blueprint.scenes];
    scenes[index] = { ...scenes[index], [field]: value };
    setBlueprint({ ...blueprint, scenes });
  }

  function updateCTA(field: keyof BlueprintCTA, value: string) {
    if (!blueprint) return;
    setBlueprint({
      ...blueprint,
      cta: { ...blueprint.cta, [field]: value },
    });
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6" data-testid="page-video-builder">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-video-builder-title">
            {t.videoBuilder.title}
          </h1>
          <p className="text-muted-foreground" data-testid="text-video-builder-description">
            {t.videoBuilder.subtitle}
          </p>
        </div>

        {hasParams && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            {t.videoBuilder.fromParams}
          </div>
        )}

        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.videoBuilder.hookLabel}</label>
              <Input
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder={t.videoBuilder.hookPlaceholder}
                data-testid="input-blueprint-hook"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.videoBuilder.formatLabel}</label>
              <Input
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder={t.videoBuilder.formatPlaceholder}
                data-testid="input-blueprint-format"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t.videoBuilder.topicLabel}</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.videoBuilder.topicPlaceholder}
              data-testid="input-blueprint-topic"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t.videoBuilder.scriptLabel}</label>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder={t.videoBuilder.scriptPlaceholder}
              rows={4}
              data-testid="input-blueprint-script"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleGenerate}
              disabled={!hook.trim() || isGenerating}
              className="gap-2"
              data-testid="button-generate-blueprint"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? t.videoBuilder.generating : t.videoBuilder.generateBlueprint}
            </Button>
          </div>
        </Card>

        {isGenerating && !blueprint && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {blueprint && (
          <div className="space-y-4" data-testid="section-blueprint-result">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{t.videoBuilder.blueprintResult}</h2>
                <Badge variant="secondary" className="text-xs">{t.videoBuilder.editableHint}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="gap-2"
                  data-testid="button-regenerate-blueprint"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                  {t.videoBuilder.regenerate}
                </Button>
                <Button
                  onClick={handleSaveToProject}
                  disabled={isSaving}
                  className="gap-2"
                  data-testid="button-save-blueprint-project"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t.videoBuilder.saving : t.videoBuilder.saveToProject}
                </Button>
              </div>
            </div>

            <Card className="p-4 space-y-3" data-testid="card-blueprint-hook">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">{t.videoBuilder.hookSection}</h3>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.textLabel}</label>
                  <Input
                    value={blueprint.hook.text}
                    onChange={(e) => updateBlueprintHook("text", e.target.value)}
                    data-testid="input-edit-hook-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.visualSuggestion}</label>
                  <Textarea
                    value={blueprint.hook.visual_suggestion}
                    onChange={(e) => updateBlueprintHook("visual_suggestion", e.target.value)}
                    rows={2}
                    data-testid="input-edit-hook-visual"
                  />
                </div>
              </div>
            </Card>

            {blueprint.scenes.map((scene, i) => (
              <Card key={i} className="p-4 space-y-3" data-testid={`card-blueprint-scene-${i}`}>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    {t.videoBuilder.sceneTitle} {i + 1}: {scene.title}
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.descriptionLabel}</label>
                    <Textarea
                      value={scene.description}
                      onChange={(e) => updateScene(i, "description", e.target.value)}
                      rows={2}
                      data-testid={`input-edit-scene-description-${i}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.visualSuggestion}</label>
                    <Textarea
                      value={scene.visual_suggestion}
                      onChange={(e) => updateScene(i, "visual_suggestion", e.target.value)}
                      rows={2}
                      data-testid={`input-edit-scene-visual-${i}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.scriptLines}</label>
                    <Textarea
                      value={scene.script_lines}
                      onChange={(e) => updateScene(i, "script_lines", e.target.value)}
                      rows={2}
                      data-testid={`input-edit-scene-script-${i}`}
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Card className="p-4 space-y-3" data-testid="card-blueprint-cta">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">{t.videoBuilder.ctaSection}</h3>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.textLabel}</label>
                  <Input
                    value={blueprint.cta.text}
                    onChange={(e) => updateCTA("text", e.target.value)}
                    data-testid="input-edit-cta-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.visualSuggestion}</label>
                  <Textarea
                    value={blueprint.cta.visual_suggestion}
                    onChange={(e) => updateCTA("visual_suggestion", e.target.value)}
                    rows={2}
                    data-testid="input-edit-cta-visual"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {!blueprint && !isGenerating && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Video className="w-12 h-12 mb-4 opacity-30" />
            <p>{t.videoBuilder.noBlueprint}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
