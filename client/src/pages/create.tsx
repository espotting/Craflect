import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  FileText,
  Video,
  Eye,
  TrendingUp,
  Loader2,
  RefreshCw,
  Pencil,
  Megaphone,
  CheckCircle,
  Copy,
  Download,
  Check,
} from "lucide-react";
import { getPredictedViews, getViralityColor } from "@/lib/predicted-views";

interface StructuredScript {
  hook_line: string;
  scene_1: string;
  scene_2: string;
  scene_3: string;
  cta: string;
  hook_variations?: string[];
  structure?: string;
}

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

function formatLabel(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CreatePage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const STEP_LABELS = [
    t.createFlow?.step1 || "Idea",
    t.createFlow?.step2 || "Script",
    t.createFlow?.step3 || "Blueprint",
    t.createFlow?.step4 || "Export",
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [hook, setHook] = useState("");
  const [format, setFormat] = useState("");
  const [topic, setTopic] = useState("");
  const [structure, setStructure] = useState("");
  const [context, setContext] = useState("");

  const [script, setScript] = useState<StructuredScript | null>(null);
  const [editHookLine, setEditHookLine] = useState("");
  const [editScene1, setEditScene1] = useState("");
  const [editScene2, setEditScene2] = useState("");
  const [editScene3, setEditScene3] = useState("");
  const [editCta, setEditCta] = useState("");

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);

  const [copied, setCopied] = useState(false);
  const autoSavedRef = useRef(false);
  const searchString = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const qHook = params.get("hook");
    const qFormat = params.get("format");
    const qTopic = params.get("topic");
    const qStructure = params.get("structure");
    if (qHook && !hook) setHook(qHook);
    if (qFormat && !format) setFormat(qFormat);
    if (qTopic && !topic) setTopic(qTopic);
    if (qStructure && !structure) setStructure(qStructure);
  }, []);

  useEffect(() => {
    if (script) {
      setEditHookLine(script.hook_line || "");
      setEditScene1(script.scene_1 || "");
      setEditScene2(script.scene_2 || "");
      setEditScene3(script.scene_3 || "");
      setEditCta(script.cta || "");
    }
  }, [script]);

  const generateScriptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate/script", {
        hook,
        format: format || undefined,
        topic: topic || undefined,
        context: context || undefined,
      });
      return res.json() as Promise<StructuredScript>;
    },
    onSuccess: (data) => {
      setScript(data);
      autoSaveProject(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate script", variant: "destructive" });
    },
  });

  async function autoSaveProject(scriptData?: StructuredScript) {
    if (autoSavedRef.current) return;
    try {
      const s = scriptData || script;
      await apiRequest("POST", "/api/projects", {
        title: (hook || "Untitled").substring(0, 80),
        hook,
        format: format || undefined,
        topic: topic || undefined,
        script: s ? {
          hook_line: s.hook_line,
          scene_1: s.scene_1,
          scene_2: s.scene_2,
          scene_3: s.scene_3,
          cta: s.cta,
          structure: s.structure,
        } : undefined,
        blueprint: blueprint || undefined,
        status: "draft",
      });
      autoSavedRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } catch {}
  }

  async function handleGenerateBlueprint() {
    if (!hook.trim()) return;
    setIsGeneratingBlueprint(true);
    try {
      const res = await apiRequest("POST", "/api/generate/blueprint", {
        hook: hook.trim(),
        format: format.trim() || undefined,
        topic: topic.trim() || undefined,
        hook_line: editHookLine || undefined,
        scene_1: editScene1 || undefined,
        scene_2: editScene2 || undefined,
        scene_3: editScene3 || undefined,
        cta_text: editCta || undefined,
      });
      const data = await res.json();
      setBlueprint(data);
      if (!autoSavedRef.current) autoSaveProject();
    } catch {
      toast({ title: "Error", description: "Failed to generate blueprint", variant: "destructive" });
    } finally {
      setIsGeneratingBlueprint(false);
    }
  }

  function updateBlueprintHook(field: keyof BlueprintHook, value: string) {
    if (!blueprint) return;
    setBlueprint({ ...blueprint, hook: { ...blueprint.hook, [field]: value } });
  }

  function updateScene(index: number, field: keyof BlueprintScene, value: string) {
    if (!blueprint) return;
    const scenes = [...blueprint.scenes];
    scenes[index] = { ...scenes[index], [field]: value };
    setBlueprint({ ...blueprint, scenes });
  }

  function updateCTA(field: keyof BlueprintCTA, value: string) {
    if (!blueprint) return;
    setBlueprint({ ...blueprint, cta: { ...blueprint.cta, [field]: value } });
  }

  function getExportText() {
    const parts: string[] = [];
    parts.push(`=== VIRAL VIDEO SCRIPT ===\n`);
    parts.push(`Topic: ${formatLabel(topic)}`);
    parts.push(`Format: ${formatLabel(format)}`);
    parts.push(`Hook: ${hook}\n`);

    if (script) {
      parts.push(`--- SCRIPT ---\n`);
      parts.push(`[HOOK]\n${editHookLine || script.hook_line}\n`);
      parts.push(`[SCENE 1]\n${editScene1 || script.scene_1}\n`);
      parts.push(`[SCENE 2]\n${editScene2 || script.scene_2}\n`);
      parts.push(`[SCENE 3]\n${editScene3 || script.scene_3}\n`);
      parts.push(`[CTA]\n${editCta || script.cta}\n`);
    }

    if (blueprint) {
      parts.push(`\n--- VIDEO BLUEPRINT ---\n`);
      parts.push(`[HOOK]\n${blueprint.hook.text}\nVisual: ${blueprint.hook.visual_suggestion}\n`);
      blueprint.scenes.forEach((scene, i) => {
        parts.push(`[SCENE ${i + 1}: ${scene.title}]\n${scene.description}\nVisual: ${scene.visual_suggestion}\nScript: ${scene.script_lines}\n`);
      });
      parts.push(`[CTA]\n${blueprint.cta.text}\nVisual: ${blueprint.cta.visual_suggestion}\n`);
    }

    return parts.join("\n");
  }

  function handleCopyExport() {
    navigator.clipboard.writeText(getExportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  }

  function handleDownloadExport() {
    const blob = new Blob([getExportText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `craflect-script-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const canGoNext = () => {
    if (currentStep === 0) return !!hook.trim();
    if (currentStep === 1) return !!script;
    if (currentStep === 2) return !!blueprint;
    return false;
  };

  const viralityScore = 75;
  const predicted = getPredictedViews(viralityScore);
  const viralityColorClass = getViralityColor(viralityScore);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto" data-testid="page-create">
        <div className="flex flex-row items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-create-title">
              {t.createFlow?.title || "Create Viral Video"}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-create-subtitle">
              {t.createFlow?.subtitle || "From idea to export in 4 steps"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap" data-testid="stepper">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  i === currentStep
                    ? "bg-primary text-primary-foreground"
                    : i < currentStep
                    ? "bg-primary/10 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-${i}`}
              >
                {i < currentStep ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">{i + 1}</span>
                )}
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEP_LABELS.length - 1 && (
                <div className="w-6 h-px bg-border" />
              )}
            </div>
          ))}
        </div>

        {currentStep === 0 && (
          <StepIdea
            hook={hook} setHook={setHook}
            format={format} setFormat={setFormat}
            topic={topic} setTopic={setTopic}
            structure={structure} setStructure={setStructure}
            context={context} setContext={setContext}
            predicted={predicted}
            viralityColorClass={viralityColorClass}
            t={t}
          />
        )}

        {currentStep === 1 && (
          <StepScript
            hook={hook}
            script={script}
            editHookLine={editHookLine} setEditHookLine={setEditHookLine}
            editScene1={editScene1} setEditScene1={setEditScene1}
            editScene2={editScene2} setEditScene2={setEditScene2}
            editScene3={editScene3} setEditScene3={setEditScene3}
            editCta={editCta} setEditCta={setEditCta}
            generateMutation={generateScriptMutation}
            t={t}
          />
        )}

        {currentStep === 2 && (
          <StepBlueprint
            hook={hook}
            blueprint={blueprint}
            isGenerating={isGeneratingBlueprint}
            onGenerate={handleGenerateBlueprint}
            updateBlueprintHook={updateBlueprintHook}
            updateScene={updateScene}
            updateCTA={updateCTA}
            t={t}
          />
        )}

        {currentStep === 3 && (
          <StepExport
            hook={hook} format={format} topic={topic}
            script={script}
            editHookLine={editHookLine}
            editScene1={editScene1}
            editScene2={editScene2}
            editScene3={editScene3}
            editCta={editCta}
            blueprint={blueprint}
            copied={copied}
            onCopy={handleCopyExport}
            onDownload={handleDownloadExport}
            t={t}
          />
        )}

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.createFlow?.back || "Back"}
          </Button>
          {currentStep < 3 && (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canGoNext()}
              className="gap-2"
              data-testid="button-next"
            >
              {t.createFlow?.next || "Next"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StepIdea({
  hook, setHook, format, setFormat, topic, setTopic,
  structure, setStructure, context, setContext,
  predicted, viralityColorClass, t,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="step-idea-content">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Card className="p-5 flex flex-col gap-4" data-testid="card-idea-edit">
          <div className="flex items-center gap-2 mb-1">
            <Pencil className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">Your Viral Idea</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="idea-hook">Hook *</Label>
            <Textarea
              id="idea-hook"
              data-testid="input-hook"
              value={hook}
              onChange={(e: any) => setHook(e.target.value)}
              placeholder="e.g. 3 AI tools nobody talks about"
              className="resize-none min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idea-format">Format</Label>
              <Input
                id="idea-format"
                data-testid="input-format"
                value={format}
                onChange={(e: any) => setFormat(e.target.value)}
                placeholder="e.g. listicle, tutorial"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idea-topic">Topic</Label>
              <Input
                id="idea-topic"
                data-testid="input-topic"
                value={topic}
                onChange={(e: any) => setTopic(e.target.value)}
                placeholder="e.g. ai_tools"
              />
            </div>
          </div>

          {structure && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idea-structure">Video Structure</Label>
              <Input
                id="idea-structure"
                data-testid="input-structure"
                value={structure}
                onChange={(e: any) => setStructure(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="idea-context">Additional Context</Label>
            <Textarea
              id="idea-context"
              data-testid="input-context"
              value={context}
              onChange={(e: any) => setContext(e.target.value)}
              placeholder="Any additional details for the AI..."
              className="resize-none min-h-[60px]"
            />
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="p-5 space-y-4" data-testid="card-idea-preview">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground text-sm">Preview</span>
          </div>

          {hook ? (
            <div className="space-y-3">
              {topic && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Topic</span>
                  <p className="text-sm font-medium text-primary" data-testid="text-preview-topic">
                    {TOPIC_CLUSTER_LABELS[topic] || formatLabel(topic)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hook</span>
                <p className="text-sm font-semibold text-foreground" data-testid="text-preview-hook">
                  "{hook}"
                </p>
              </div>
              {format && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Format</span>
                  <p className="text-sm text-foreground" data-testid="text-preview-format">
                    {formatLabel(format)}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground" data-testid="text-preview-predicted">{predicted.label}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Enter a hook to see preview
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function StepScript({
  hook, script,
  editHookLine, setEditHookLine,
  editScene1, setEditScene1,
  editScene2, setEditScene2,
  editScene3, setEditScene3,
  editCta, setEditCta,
  generateMutation, t,
}: any) {
  return (
    <div className="flex flex-col gap-4" data-testid="step-script-content">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Script</h2>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || !hook.trim()}
          className="gap-2"
          data-testid="button-generate-script"
        >
          {generateMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : script ? (
            <><RefreshCw className="w-4 h-4" /> Regenerate Script</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Script</>
          )}
        </Button>
      </div>

      {generateMutation.isPending && !script && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {script && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Editable</Badge>
            {script.structure && (
              <Badge variant="outline" className="text-xs" data-testid="badge-script-structure">
                {script.structure}
              </Badge>
            )}
          </div>

          <ScriptSection
            label="Hook"
            icon={<Megaphone className="w-4 h-4 text-violet-500" />}
            value={editHookLine}
            onChange={setEditHookLine}
            testId="textarea-hook-line"
            accent="border-l-violet-500"
          />

          {script.hook_variations && script.hook_variations.length > 0 && (
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Alternative Hooks</p>
              <div className="space-y-2">
                {script.hook_variations.map((v: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-md border border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => setEditHookLine(v)}
                    data-testid={`hook-variation-${i}`}
                  >
                    <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">
                      {String.fromCharCode(65 + i)}
                    </Badge>
                    <p className="text-sm text-foreground">{v}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <ScriptSection
            label="Scene 1"
            icon={<span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-500 text-[10px] flex items-center justify-center font-bold">1</span>}
            value={editScene1}
            onChange={setEditScene1}
            testId="textarea-scene-1"
            accent="border-l-blue-500"
          />

          <ScriptSection
            label="Scene 2"
            icon={<span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] flex items-center justify-center font-bold">2</span>}
            value={editScene2}
            onChange={setEditScene2}
            testId="textarea-scene-2"
            accent="border-l-emerald-500"
          />

          <ScriptSection
            label="Scene 3"
            icon={<span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 text-[10px] flex items-center justify-center font-bold">3</span>}
            value={editScene3}
            onChange={setEditScene3}
            testId="textarea-scene-3"
            accent="border-l-amber-500"
          />

          <ScriptSection
            label="Call to Action"
            icon={<Megaphone className="w-4 h-4 text-red-500" />}
            value={editCta}
            onChange={setEditCta}
            testId="textarea-cta"
            accent="border-l-red-500"
          />
        </div>
      )}

      {!script && !generateMutation.isPending && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Click "Generate Script" to create your viral video script</p>
            <p className="text-xs text-muted-foreground/60 mt-1">AI will generate hook, scenes, and CTA</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScriptSection({ label, icon, value, onChange, testId, accent }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  accent: string;
}) {
  return (
    <Card className={`p-4 border-l-4 ${accent}`} data-testid={`card-${testId}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <Textarea
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        className="resize-none min-h-[80px]"
        data-testid={testId}
      />
    </Card>
  );
}

function StepBlueprint({
  hook, blueprint, isGenerating, onGenerate,
  updateBlueprintHook, updateScene, updateCTA, t,
}: any) {
  return (
    <div className="flex flex-col gap-4" data-testid="step-blueprint-content">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Video Blueprint</h2>
        </div>
        <Button
          onClick={onGenerate}
          disabled={!hook.trim() || isGenerating}
          className="gap-2"
          data-testid="button-generate-blueprint"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : blueprint ? (
            <><RefreshCw className="w-4 h-4" /> Regenerate Blueprint</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Blueprint</>
          )}
        </Button>
      </div>

      {isGenerating && !blueprint && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {blueprint && (
        <div className="space-y-4" data-testid="section-blueprint-result">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Editable</Badge>
          </div>

          <Card className="p-4 space-y-3 border-l-4 border-l-violet-500" data-testid="card-blueprint-hook">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-violet-500" />
              <h3 className="font-semibold text-foreground">Hook</h3>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Text</label>
                <Input
                  value={blueprint.hook.text}
                  onChange={(e: any) => updateBlueprintHook("text", e.target.value)}
                  data-testid="input-edit-hook-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Visual Suggestion</label>
                <Textarea
                  value={blueprint.hook.visual_suggestion}
                  onChange={(e: any) => updateBlueprintHook("visual_suggestion", e.target.value)}
                  rows={2}
                  data-testid="input-edit-hook-visual"
                />
              </div>
            </div>
          </Card>

          {blueprint.scenes.map((scene: BlueprintScene, i: number) => (
            <Card key={i} className="p-4 space-y-3" data-testid={`card-blueprint-scene-${i}`}>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Scene {i + 1}: {scene.title}
                </h3>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea
                    value={scene.description}
                    onChange={(e: any) => updateScene(i, "description", e.target.value)}
                    rows={2}
                    data-testid={`input-edit-scene-description-${i}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Visual Suggestion</label>
                  <Textarea
                    value={scene.visual_suggestion}
                    onChange={(e: any) => updateScene(i, "visual_suggestion", e.target.value)}
                    rows={2}
                    data-testid={`input-edit-scene-visual-${i}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Script Lines</label>
                  <Textarea
                    value={scene.script_lines}
                    onChange={(e: any) => updateScene(i, "script_lines", e.target.value)}
                    rows={2}
                    data-testid={`input-edit-scene-script-${i}`}
                  />
                </div>
              </div>
            </Card>
          ))}

          <Card className="p-4 space-y-3 border-l-4 border-l-red-500" data-testid="card-blueprint-cta">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-red-500" />
              <h3 className="font-semibold text-foreground">Call to Action</h3>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Text</label>
                <Input
                  value={blueprint.cta.text}
                  onChange={(e: any) => updateCTA("text", e.target.value)}
                  data-testid="input-edit-cta-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Visual Suggestion</label>
                <Textarea
                  value={blueprint.cta.visual_suggestion}
                  onChange={(e: any) => updateCTA("visual_suggestion", e.target.value)}
                  rows={2}
                  data-testid="input-edit-cta-visual"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {!blueprint && !isGenerating && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Video className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Click "Generate Blueprint" to create your video structure</p>
            <p className="text-xs text-muted-foreground/60 mt-1">AI will create scenes with visual suggestions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepExport({
  hook, format, topic, script,
  editHookLine, editScene1, editScene2, editScene3, editCta,
  blueprint, copied, onCopy, onDownload, t,
}: any) {
  return (
    <div className="flex flex-col gap-6" data-testid="step-export-content">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Export</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCopy} className="gap-2" data-testid="button-copy-export">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy All"}
          </Button>
          <Button onClick={onDownload} className="gap-2" data-testid="button-download-export">
            <Download className="w-4 h-4" />
            Download .txt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <Card className="p-5 space-y-4" data-testid="card-export-idea">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="font-semibold text-foreground">Idea Summary</span>
            </div>
            <div className="space-y-2 text-sm">
              {topic && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-16">Topic:</span>
                  <span className="text-foreground font-medium" data-testid="text-export-topic">
                    {TOPIC_CLUSTER_LABELS[topic] || formatLabel(topic)}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-16 shrink-0">Hook:</span>
                <span className="text-foreground font-medium" data-testid="text-export-hook">"{hook}"</span>
              </div>
              {format && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-16">Format:</span>
                  <Badge variant="outline" className="text-xs" data-testid="text-export-format">{formatLabel(format)}</Badge>
                </div>
              )}
            </div>
          </Card>

          {script && (
            <Card className="p-5 space-y-4" data-testid="card-export-script">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-foreground">Script</span>
              </div>
              <div className="space-y-3 text-sm">
                <ExportBlock label="Hook" content={editHookLine} color="violet" />
                <ExportBlock label="Scene 1" content={editScene1} color="blue" />
                <ExportBlock label="Scene 2" content={editScene2} color="emerald" />
                <ExportBlock label="Scene 3" content={editScene3} color="amber" />
                <ExportBlock label="CTA" content={editCta} color="red" />
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {blueprint && (
            <Card className="p-5 space-y-4" data-testid="card-export-blueprint">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-foreground">Video Blueprint</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-md bg-violet-500/5 border border-violet-500/20">
                  <p className="text-xs font-medium text-violet-500 mb-1">Hook</p>
                  <p className="text-foreground">{blueprint.hook.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">Visual: {blueprint.hook.visual_suggestion}</p>
                </div>
                {blueprint.scenes.map((scene: BlueprintScene, i: number) => (
                  <div key={i} className="p-3 rounded-md bg-muted/50 border border-border/50">
                    <p className="text-xs font-medium text-primary mb-1">Scene {i + 1}: {scene.title}</p>
                    <p className="text-foreground text-xs">{scene.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Visual: {scene.visual_suggestion}</p>
                  </div>
                ))}
                <div className="p-3 rounded-md bg-red-500/5 border border-red-500/20">
                  <p className="text-xs font-medium text-red-500 mb-1">CTA</p>
                  <p className="text-foreground">{blueprint.cta.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">Visual: {blueprint.cta.visual_suggestion}</p>
                </div>
              </div>
            </Card>
          )}

          {!script && !blueprint && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Download className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">No content to export yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Generate a script or blueprint first</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ExportBlock({ label, content, color }: { label: string; content: string; color: string }) {
  if (!content) return null;
  const colorMap: Record<string, string> = {
    violet: "bg-violet-500/5 border-violet-500/20 text-violet-500",
    blue: "bg-blue-500/5 border-blue-500/20 text-blue-500",
    emerald: "bg-emerald-500/5 border-emerald-500/20 text-emerald-500",
    amber: "bg-amber-500/5 border-amber-500/20 text-amber-500",
    red: "bg-red-500/5 border-red-500/20 text-red-500",
  };
  const classes = colorMap[color] || colorMap.blue;
  const [bg, border, text] = classes.split(" ");
  return (
    <div className={`p-3 rounded-md ${bg} border ${border}`}>
      <p className={`text-xs font-medium ${text} mb-1`}>{label}</p>
      <p className="text-foreground text-sm">{content}</p>
    </div>
  );
}
