import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSearch, useLocation } from "wouter";
import { TOPIC_CLUSTER_LABELS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Coins,
  Crown,
  Lock,
  Target,
  Lightbulb,
  BookmarkPlus,
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

interface CreditsInfo {
  credits: number;
  maxCredits: number;
  plan: string;
  costs: Record<string, number>;
}

function formatLabel(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function CreditsDisplay({ credits }: { credits: CreditsInfo | undefined }) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  if (!credits) return null;

  const percentage = (credits.credits / credits.maxCredits) * 100;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border/50" data-testid="credits-display">
      <Coins className="h-4 w-4 text-violet-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.min(100, percentage)}%` }} />
        </div>
      </div>
      <span className="text-xs font-medium whitespace-nowrap" data-testid="text-credits-remaining">
        {credits.credits}/{credits.maxCredits}
      </span>
      {credits.plan === "free" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] text-violet-500 hover:text-violet-400 h-6 px-2"
          onClick={() => setLocation("/billing")}
          data-testid="link-upgrade-create"
        >
          <Crown className="h-3 w-3 mr-1" />
          Upgrade
        </Button>
      )}
    </div>
  );
}

export default function CreatePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
  const [showNextActions, setShowNextActions] = useState(false);
  const autoSavedRef = useRef(false);
  const searchString = useSearch();

  const { data: credits, refetch: refetchCredits } = useQuery<CreditsInfo>({
    queryKey: ["/api/credits"],
  });

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
      refetchCredits();
      autoSaveProject(data);
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (msg.includes("402")) {
        toast({ title: t.createFlow.notEnoughCredits, description: t.createFlow.notEnoughCreditsDesc, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to generate script", variant: "destructive" });
      }
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
      refetchCredits();
      if (!autoSavedRef.current) autoSaveProject();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("402")) {
        toast({ title: t.createFlow.notEnoughCredits, description: t.createFlow.notEnoughCreditsDesc, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to generate blueprint", variant: "destructive" });
      }
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
    toast({ title: t.createFlow.copied });
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

  const isFreePlan = credits?.plan === "free";
  const viralityScore = 75;
  const predicted = getPredictedViews(viralityScore);
  const viralityColorClass = getViralityColor(viralityScore);

  function handleReset() {
    setCurrentStep(0);
    setHook("");
    setFormat("");
    setTopic("");
    setStructure("");
    setContext("");
    setScript(null);
    setBlueprint(null);
    setEditHookLine("");
    setEditScene1("");
    setEditScene2("");
    setEditScene3("");
    setEditCta("");
    setCopied(false);
    setShowNextActions(false);
    autoSavedRef.current = false;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto" data-testid="page-create">
        <div className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
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
          <div className="w-64">
            <CreditsDisplay credits={credits} />
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

        {currentStep === 0 && <StepIdea
          hook={hook} setHook={setHook}
          format={format} setFormat={setFormat}
          topic={topic} setTopic={setTopic}
          context={context} setContext={setContext}
          viralityScore={viralityScore}
          predicted={predicted}
          viralityColorClass={viralityColorClass}
          t={t}
        />}
        {currentStep === 1 && <StepScript
          script={script}
          editHookLine={editHookLine} setEditHookLine={setEditHookLine}
          editScene1={editScene1} setEditScene1={setEditScene1}
          editScene2={editScene2} setEditScene2={setEditScene2}
          editScene3={editScene3} setEditScene3={setEditScene3}
          editCta={editCta} setEditCta={setEditCta}
          generateScriptMutation={generateScriptMutation}
          credits={credits}
          t={t}
        />}
        {currentStep === 2 && <StepBlueprint
          blueprint={blueprint}
          isGenerating={isGeneratingBlueprint}
          onGenerate={handleGenerateBlueprint}
          updateBlueprintHook={updateBlueprintHook}
          updateScene={updateScene}
          updateCTA={updateCTA}
          credits={credits}
          t={t}
        />}
        {currentStep === 3 && (
          showNextActions ? (
            <NextActionsScreen onReset={handleReset} t={t} />
          ) : (
            <StepExport
              script={script}
              blueprint={blueprint}
              editHookLine={editHookLine}
              editScene1={editScene1}
              editScene2={editScene2}
              editScene3={editScene3}
              editCta={editCta}
              hook={hook}
              format={format}
              topic={topic}
              copied={copied}
              onCopy={handleCopyExport}
              onDownload={handleDownloadExport}
              isFreePlan={isFreePlan}
              onShowNextActions={() => setShowNextActions(true)}
              t={t}
            />
          )
        )}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t.createFlow?.back || "Back"}
          </Button>
          {currentStep < 3 && (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canGoNext()}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="button-next"
            >
              {t.createFlow?.next || "Next Step"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StepIdea({ hook, setHook, format, setFormat, topic, setTopic, context, setContext, viralityScore, predicted, viralityColorClass, t }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium">Hook *</Label>
              <Input
                placeholder='e.g. "3 AI tools nobody talks about"'
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                className="mt-1"
                data-testid="input-hook"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">{t.createFlow?.step3 || "Format"}</Label>
                <Input
                  placeholder="e.g. Listicle, Tutorial"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="mt-1"
                  data-testid="input-format"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Topic</Label>
                <Input
                  placeholder="e.g. AI Tools"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1"
                  data-testid="input-topic"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Context</Label>
              <Textarea
                placeholder="Additional context for better AI results..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="mt-1 h-20"
                data-testid="input-context"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card className="border border-border/50">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-violet-500" />
              Preview
            </h3>
            {hook ? (
              <>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                  <p className="text-sm font-medium">"{hook}"</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {format && <Badge variant="outline" className="text-[10px]">{formatLabel(format)}</Badge>}
                    {topic && <Badge variant="outline" className="text-[10px]">{formatLabel(topic)}</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded-lg bg-background/40 border border-border/30">
                    <div className={`text-lg font-bold ${viralityColorClass}`}>{viralityScore}</div>
                    <div className="text-[10px] text-muted-foreground">Predicted Score</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-background/40 border border-border/30">
                    <div className="text-sm font-semibold">{predicted.label}</div>
                    <div className="text-[10px] text-muted-foreground">Est. Views</div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t.createFlow?.enterHookPreview || "Enter a hook to see preview"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepScript({ script, editHookLine, setEditHookLine, editScene1, setEditScene1, editScene2, setEditScene2, editScene3, setEditScene3, editCta, setEditCta, generateScriptMutation, credits, t }: any) {
  const scriptCost = credits?.costs?.script || 3;
  const hasEnoughCredits = credits ? credits.credits >= scriptCost : true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => generateScriptMutation.mutate()}
            disabled={generateScriptMutation.isPending || !hasEnoughCredits}
            className="bg-violet-600 hover:bg-violet-700"
            data-testid="button-generate-script"
          >
            {generateScriptMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.createFlow?.generating || "Generating..."}</>
            ) : script ? (
              <><RefreshCw className="w-4 h-4 mr-2" />{t.createFlow?.regenerateScript || "Regenerate Script"}</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />{t.createFlow?.generateScript || "Generate Script"}</>
            )}
          </Button>
          <Badge variant="outline" className="text-xs">
            <Coins className="h-3 w-3 mr-1" />
            {scriptCost} {t.createFlow?.creditsCost?.replace("{n}", "") || "credits"}
          </Badge>
        </div>
        {!hasEnoughCredits && (
          <p className="text-xs text-destructive">{t.createFlow?.notEnoughCredits || "Not enough credits"}</p>
        )}
      </div>

      {script ? (
        <div className="space-y-3">
          <ScriptSection icon={Sparkles} label="Hook" color="violet" value={editHookLine} onChange={setEditHookLine} testId="edit-hook-line" />
          <ScriptSection icon={FileText} label="Scene 1 — Setup" color="blue" value={editScene1} onChange={setEditScene1} testId="edit-scene-1" />
          <ScriptSection icon={FileText} label="Scene 2 — Core Value" color="emerald" value={editScene2} onChange={setEditScene2} testId="edit-scene-2" />
          <ScriptSection icon={FileText} label="Scene 3 — Proof" color="amber" value={editScene3} onChange={setEditScene3} testId="edit-scene-3" />
          <ScriptSection icon={Megaphone} label="CTA" color="red" value={editCta} onChange={setEditCta} testId="edit-cta" />

          {script.hook_variations && script.hook_variations.length > 0 && (
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t.createFlow?.alternativeHooks || "Alternative Hooks"}</p>
                <div className="space-y-2">
                  {script.hook_variations.map((v: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setEditHookLine(v)}
                      className="w-full text-left p-2 rounded-md text-sm hover:bg-muted/50 transition-colors border border-border/30"
                      data-testid={`button-alt-hook-${i}`}
                    >
                      "{v}"
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">{t.createFlow?.clickGenerateScript || 'Click "Generate Script" to create your viral video script'}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t.createFlow?.aiGenerateHint || "AI will generate hook, scenes, and CTA"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScriptSection({ icon: Icon, label, color, value, onChange, testId }: any) {
  const colorMap: Record<string, string> = {
    violet: "border-violet-500/20 bg-violet-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    red: "border-red-500/20 bg-red-500/5",
  };
  const labelColorMap: Record<string, string> = {
    violet: "text-violet-500",
    blue: "text-blue-500",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    red: "text-red-500",
  };

  return (
    <Card className={`border ${colorMap[color] || ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${labelColorMap[color] || ""}`} />
          <span className={`text-xs font-medium ${labelColorMap[color] || ""}`}>{label}</span>
          <Badge variant="outline" className="text-[10px] ml-auto">
            <Pencil className="w-2.5 h-2.5 mr-1" />
            Editable
          </Badge>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[60px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0"
          data-testid={testId}
        />
      </CardContent>
    </Card>
  );
}

function StepBlueprint({ blueprint, isGenerating, onGenerate, updateBlueprintHook, updateScene, updateCTA, credits, t }: any) {
  const blueprintCost = credits?.costs?.blueprint || 3;
  const hasEnoughCredits = credits ? credits.credits >= blueprintCost : true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={onGenerate}
            disabled={isGenerating || !hasEnoughCredits}
            className="bg-violet-600 hover:bg-violet-700"
            data-testid="button-generate-blueprint"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.createFlow?.generating || "Generating..."}</>
            ) : blueprint ? (
              <><RefreshCw className="w-4 h-4 mr-2" />{t.createFlow?.regenerateBlueprint || "Regenerate Blueprint"}</>
            ) : (
              <><Video className="w-4 h-4 mr-2" />{t.createFlow?.generateBlueprint || "Generate Blueprint"}</>
            )}
          </Button>
          <Badge variant="outline" className="text-xs">
            <Coins className="h-3 w-3 mr-1" />
            {blueprintCost} {t.createFlow?.creditsCost?.replace("{n}", "") || "credits"}
          </Badge>
        </div>
        {!hasEnoughCredits && (
          <p className="text-xs text-destructive">{t.createFlow?.notEnoughCredits || "Not enough credits"}</p>
        )}
      </div>

      {blueprint ? (
        <div className="space-y-3">
          <Card className="border border-violet-500/20 bg-violet-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-medium text-violet-500">Hook (0-3s)</span>
              </div>
              <Textarea
                value={blueprint.hook.text}
                onChange={(e) => updateBlueprintHook("text", e.target.value)}
                className="min-h-[40px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 mb-2"
                data-testid="edit-bp-hook"
              />
              <p className="text-xs text-muted-foreground">Visual: {blueprint.hook.visual_suggestion}</p>
            </CardContent>
          </Card>

          {blueprint.scenes.map((scene: BlueprintScene, i: number) => (
            <Card key={i} className="border border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary">Scene {i + 1}: {scene.title}</span>
                </div>
                <Textarea
                  value={scene.description}
                  onChange={(e) => updateScene(i, "description", e.target.value)}
                  className="min-h-[40px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 mb-2"
                  data-testid={`edit-bp-scene-${i}`}
                />
                <p className="text-xs text-muted-foreground">Visual: {scene.visual_suggestion}</p>
                <p className="text-xs text-muted-foreground mt-1">Script: {scene.script_lines}</p>
              </CardContent>
            </Card>
          ))}

          <Card className="border border-red-500/20 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-red-500">CTA</span>
              </div>
              <Textarea
                value={blueprint.cta.text}
                onChange={(e) => updateCTA("text", e.target.value)}
                className="min-h-[40px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 mb-2"
                data-testid="edit-bp-cta"
              />
              <p className="text-xs text-muted-foreground">Visual: {blueprint.cta.visual_suggestion}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Video className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">{t.createFlow?.clickGenerateBlueprint || 'Click "Generate Blueprint" to create your video structure'}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t.createFlow?.aiScenesHint || "AI will create scenes with visual suggestions"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepExport({ script, blueprint, editHookLine, editScene1, editScene2, editScene3, editCta, hook, format, topic, copied, onCopy, onDownload, isFreePlan, onShowNextActions, t }: any) {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      {isFreePlan && (script || blueprint) && (
        <Card className="border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-purple-500/10" data-testid="card-paywall">
          <CardContent className="p-6 text-center space-y-4">
            <div className="inline-flex p-3 rounded-full bg-violet-500/20">
              <Lock className="h-6 w-6 text-violet-500" />
            </div>
            <h3 className="text-lg font-bold" data-testid="text-paywall-title">{t.createFlow?.paywallTitle || "Your viral video is ready"}</h3>
            <p className="text-sm text-muted-foreground" data-testid="text-paywall-desc">{t.createFlow?.paywallDesc || "Export requires Creator plan"}</p>
            <div className="flex gap-3 justify-center">
              <Button
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => setLocation("/billing")}
                data-testid="button-paywall-upgrade"
              >
                <Crown className="h-4 w-4 mr-2" />
                {t.createFlow?.paywallUpgrade || "Upgrade"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/billing")}
                data-testid="button-paywall-plans"
              >
                {t.createFlow?.paywallViewPlans || "View Plans"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {!isFreePlan && (
          <>
            <Button
              variant="outline"
              onClick={onCopy}
              disabled={!script && !blueprint}
              data-testid="button-copy"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? t.createFlow?.copied || "Copied!" : t.createFlow?.copyAll || "Copy All"}
            </Button>
            <Button
              variant="outline"
              onClick={onDownload}
              disabled={!script && !blueprint}
              data-testid="button-download"
            >
              <Download className="w-4 h-4 mr-2" />
              {t.createFlow?.downloadTxt || "Download .txt"}
            </Button>
          </>
        )}
        {!isFreePlan && (script || blueprint) && (
          <Button
            className="ml-auto bg-violet-600 hover:bg-violet-700"
            onClick={onShowNextActions}
            data-testid="button-done"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Done
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {script && (
          <Card className="p-5 space-y-4" data-testid="card-export-script">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-500" />
              <span className="font-semibold text-foreground">{t.createFlow?.ideaSummary || "Script"}</span>
            </div>
            <div className="space-y-2 text-sm">
              <ExportBlock label="Hook" content={editHookLine || script.hook_line} color="violet" />
              <ExportBlock label="Scene 1" content={editScene1 || script.scene_1} color="blue" />
              <ExportBlock label="Scene 2" content={editScene2 || script.scene_2} color="emerald" />
              <ExportBlock label="Scene 3" content={editScene3 || script.scene_3} color="amber" />
              <ExportBlock label="CTA" content={editCta || script.cta} color="red" />
            </div>
          </Card>
        )}

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
              <p className="text-sm">{t.createFlow?.noContentExport || "No content to export yet"}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t.createFlow?.noContentExportHint || "Generate a script or blueprint first"}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function NextActionsScreen({ onReset, t }: { onReset: () => void; t: any }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const actions = [
    {
      icon: Sparkles,
      title: t.createFlow?.generateAnother || "Generate Another",
      desc: t.createFlow?.generateAnotherDesc || "Start a new viral video from scratch",
      action: onReset,
      color: "text-violet-500",
      testId: "card-next-generate",
    },
    {
      icon: Target,
      title: t.createFlow?.exploreOpportunities || "Explore Opportunities",
      desc: t.createFlow?.exploreOpportunitiesDesc || "Browse top-performing patterns",
      action: () => setLocation("/opportunities"),
      color: "text-orange-500",
      testId: "card-next-opportunities",
    },
    {
      icon: RefreshCw,
      title: t.createFlow?.improveScript || "Improve Script",
      desc: t.createFlow?.improveScriptDesc || "Refine and optimize your current script",
      action: () => {
        onReset();
      },
      color: "text-blue-500",
      testId: "card-next-improve",
    },
    {
      icon: BookmarkPlus,
      title: t.createFlow?.saveToWorkspace || "Save to Workspace",
      desc: t.createFlow?.saveToWorkspaceDesc || "Keep this project for later",
      action: () => {
        toast({ title: t.createFlow?.scriptSaved || "Script saved to workspace" });
        setLocation("/workspace");
      },
      color: "text-green-500",
      testId: "card-next-save",
    },
  ];

  return (
    <div className="space-y-6" data-testid="section-next-actions">
      <div className="text-center">
        <div className="inline-flex p-3 rounded-full bg-green-500/20 mb-3">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold">{t.createFlow?.nextActions || "What do you want to do next?"}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {actions.map((action) => (
          <Card
            key={action.testId}
            className="border border-border/50 cursor-pointer hover:border-border transition-colors"
            onClick={action.action}
            data-testid={action.testId}
          >
            <CardContent className="p-5 text-center space-y-3">
              <div className={`inline-flex p-3 rounded-xl bg-muted/50 ${action.color}`}>
                <action.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-sm">{action.title}</h3>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </CardContent>
          </Card>
        ))}
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
