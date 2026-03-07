import { DashboardLayout } from "@/components/layout";
import { ContentScorecard } from "@/components/content-scorecard";
import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";
import { TOPIC_CLUSTER_LABELS, type SavedIdea } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Lightbulb,
  Repeat,
  Compass,
  ArrowLeft,
  ArrowRight,
  FileText,
  Video,
  Eye,
  TrendingUp,
  Loader2,
  RefreshCw,
  Save,
  Pencil,
  Megaphone,
  CheckCircle,
  BarChart3,
  Zap,
  Target,
  ArrowUpRight,
} from "lucide-react";

interface Opportunity {
  hook: string;
  format: string;
  topic: string;
  hook_mechanism: string | null;
  opportunity_score: number;
  velocity: number;
  videos_detected: number;
  avg_engagement: number;
  total_views: number;
}

interface GeneratedScript {
  hook: string;
  hook_variations?: string[];
  structure: string;
  script: string;
  cta: string;
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

interface PredictionResult {
  viral_probability: number;
  predicted_views: {
    low: number;
    high: number;
    formatted: string;
  };
  based_on: number;
}

interface ImproveResult {
  improved_hook: string;
  improved_format: string;
  improved_cta: string;
  tips: string[];
}

type SourceType = "opportunity" | "idea" | "remix";

export default function CreatePage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [sourceType, setSourceType] = useState<SourceType | null>(null);

  const [hook, setHook] = useState("");
  const [format, setFormat] = useState("");
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [remixContent, setRemixContent] = useState("");
  const [remixContentType, setRemixContentType] = useState("script");

  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [editHook, setEditHook] = useState("");
  const [editStructure, setEditStructure] = useState("");
  const [editScript, setEditScript] = useState("");
  const [editCta, setEditCta] = useState("");

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [improvement, setImprovement] = useState<ImproveResult | null>(null);

  const autoSavedRef = useRef(false);
  const searchString = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const qHook = params.get("hook");
    const qFormat = params.get("format");
    const qTopic = params.get("topic");
    if (qHook && !hook) {
      setHook(qHook);
      setSourceType("opportunity");
      setCurrentStep(1);
    }
    if (qFormat && !format) setFormat(qFormat);
    if (qTopic && !topic) setTopic(qTopic);
  }, []);

  const steps = [
    t.createFlow.step1,
    t.createFlow.step2,
    t.createFlow.step3,
    t.createFlow.step4,
  ];

  const { data: engineData, isLoading: isLoadingEngine } = useQuery<{ opportunities: Opportunity[] }>({
    queryKey: ["/api/opportunities/engine"],
  });

  const { data: savedIdeas, isLoading: isLoadingSaved } = useQuery<SavedIdea[]>({
    queryKey: ["/api/ideas"],
  });

  useEffect(() => {
    if (generatedScript) {
      setEditHook(generatedScript.hook);
      setEditStructure(generatedScript.structure);
      setEditScript(generatedScript.script);
      setEditCta(generatedScript.cta);
    }
  }, [generatedScript]);

  const generateScriptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate/script", {
        hook,
        format: format || undefined,
        topic: topic || undefined,
        context: context || undefined,
      });
      return res.json() as Promise<GeneratedScript>;
    },
    onSuccess: (data) => {
      setGeneratedScript(data);
      autoSaveProject(data);
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: t.scriptGenerator.generateError,
        variant: "destructive",
      });
    },
  });

  const remixMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/remix", { content: remixContent, contentType: remixContentType });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.improved_hook) setHook(data.improved_hook);
      if (data.optimized_script) {
        setGeneratedScript({
          hook: data.improved_hook || hook,
          structure: data.structure_suggestion || "",
          script: data.optimized_script || "",
          cta: "",
        });
      }
      if (data.blueprint) setBlueprint(data.blueprint);
      setCurrentStep(1);
    },
    onError: () => {
      toast({ title: t.common.error, description: t.remixEngine.error, variant: "destructive" });
    },
  });

  async function autoSaveProject(script?: GeneratedScript) {
    if (autoSavedRef.current) return;
    try {
      const scriptData = script || generatedScript;
      await apiRequest("POST", "/api/projects", {
        title: (scriptData?.hook || hook).substring(0, 80) || "Untitled Project",
        hook: scriptData?.hook || hook,
        format: format || undefined,
        topic: topic || undefined,
        script: scriptData ? {
          hook: scriptData.hook,
          structure: scriptData.structure,
          script: scriptData.script,
          cta: scriptData.cta,
        } : undefined,
        blueprint: blueprint || undefined,
        status: "draft",
      });
      autoSavedRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: t.common.success, description: t.createFlow.autoSaved });
    } catch {
    }
  }

  async function handleGenerateBlueprint() {
    if (!hook.trim()) return;
    setIsGeneratingBlueprint(true);
    try {
      const res = await apiRequest("POST", "/api/generate/blueprint", {
        hook: hook.trim(),
        format: format.trim() || undefined,
        topic: topic.trim() || undefined,
        script: editScript.trim() || undefined,
      });
      const data = await res.json();
      setBlueprint(data);
      if (!autoSavedRef.current) autoSaveProject();
    } catch {
      toast({ title: t.common.error, description: t.videoBuilder.errorGenerate, variant: "destructive" });
    } finally {
      setIsGeneratingBlueprint(false);
    }
  }

  const predictMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/predict/views", {
        hook,
        format: format || undefined,
        topic: (topic && topic !== "none") ? topic : undefined,
        script: editScript || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPrediction(data);
      setImprovement(null);
    },
    onError: () => {
      toast({ title: t.predictedViews.error, variant: "destructive" });
    },
  });

  const improveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/predict/improve", {
        hook,
        format: format || undefined,
        topic: (topic && topic !== "none") ? topic : undefined,
        script: editScript || undefined,
        cta: editCta || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setImprovement(data);
    },
    onError: () => {
      toast({ title: t.predictedViews.improveError, variant: "destructive" });
    },
  });

  function selectOpportunity(opp: Opportunity) {
    setHook(opp.hook);
    setFormat(opp.format || "");
    setTopic(opp.topic || "");
    setSourceType("opportunity");
    setCurrentStep(1);
  }

  function selectIdea(idea: SavedIdea) {
    setHook(idea.hook);
    setFormat(idea.format || "");
    setTopic(idea.topic || "");
    setSourceType("idea");
    setCurrentStep(1);
  }

  function selectRemix() {
    setSourceType("remix");
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

  const probabilityColor = (p: number) => {
    if (p >= 70) return "text-emerald-500";
    if (p >= 50) return "text-yellow-500";
    return "text-red-400";
  };

  const probabilityBg = (p: number) => {
    if (p >= 70) return "bg-emerald-500";
    if (p >= 50) return "bg-yellow-500";
    return "bg-red-400";
  };

  const canGoNext = () => {
    if (currentStep === 0) return !!sourceType && !!hook.trim();
    if (currentStep === 1) return !!generatedScript;
    if (currentStep === 2) return !!blueprint;
    return false;
  };

  const opportunities = engineData?.opportunities || [];
  const activeSavedIdeas = (savedIdeas || []).filter((i) => i.status === "saved");

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto" data-testid="page-create">
        <div className="flex flex-row items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-create-title">
              {t.createFlow.title}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-create-subtitle">
              {t.createFlow.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap" data-testid="stepper">
          {steps.map((label, i) => (
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
              {i < steps.length - 1 && (
                <div className="w-6 h-px bg-border" />
              )}
            </div>
          ))}
        </div>

        {currentStep === 0 && (
          <StepChooseSource
            sourceType={sourceType}
            onSelectRemix={selectRemix}
            remixContent={remixContent}
            setRemixContent={setRemixContent}
            remixContentType={remixContentType}
            setRemixContentType={setRemixContentType}
            remixMutation={remixMutation}
            opportunities={opportunities}
            isLoadingEngine={isLoadingEngine}
            savedIdeas={activeSavedIdeas}
            isLoadingSaved={isLoadingSaved}
            onSelectOpportunity={selectOpportunity}
            onSelectIdea={selectIdea}
            t={t}
          />
        )}

        {currentStep === 1 && (
          <StepGenerateScript
            hook={hook}
            setHook={setHook}
            format={format}
            setFormat={setFormat}
            topic={topic}
            setTopic={setTopic}
            context={context}
            setContext={setContext}
            generatedScript={generatedScript}
            editHook={editHook}
            setEditHook={setEditHook}
            editStructure={editStructure}
            setEditStructure={setEditStructure}
            editScript={editScript}
            setEditScript={setEditScript}
            editCta={editCta}
            setEditCta={setEditCta}
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
          <StepPredictedViews
            hook={hook}
            format={format}
            editScript={editScript}
            editCta={editCta}
            prediction={prediction}
            improvement={improvement}
            predictMutation={predictMutation}
            improveMutation={improveMutation}
            probabilityColor={probabilityColor}
            probabilityBg={probabilityBg}
            generatedScript={generatedScript}
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
            {t.createFlow.back}
          </Button>
          {currentStep < 3 && (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canGoNext()}
              className="gap-2"
              data-testid="button-next"
            >
              {t.createFlow.next}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StepChooseSource({
  sourceType,
  onSelectRemix,
  remixContent,
  setRemixContent,
  remixContentType,
  setRemixContentType,
  remixMutation,
  opportunities,
  isLoadingEngine,
  savedIdeas,
  isLoadingSaved,
  onSelectOpportunity,
  onSelectIdea,
  t,
}: any) {
  const [activeSource, setActiveSource] = useState<SourceType | null>(sourceType);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card
          className={`p-4 cursor-pointer transition-colors hover-elevate ${activeSource === "opportunity" ? "border-primary bg-primary/5" : ""}`}
          onClick={() => setActiveSource("opportunity")}
          data-testid="source-opportunity"
        >
          <CardContent className="p-0 flex flex-col items-center text-center gap-2">
            <Compass className="w-8 h-8 text-primary" />
            <p className="text-sm font-semibold text-foreground">{t.createFlow.sourceOpportunity}</p>
            <p className="text-xs text-muted-foreground">{t.createFlow.sourceOpportunityDesc}</p>
          </CardContent>
        </Card>

        <Card
          className={`p-4 cursor-pointer transition-colors hover-elevate ${activeSource === "idea" ? "border-primary bg-primary/5" : ""}`}
          onClick={() => setActiveSource("idea")}
          data-testid="source-idea"
        >
          <CardContent className="p-0 flex flex-col items-center text-center gap-2">
            <Lightbulb className="w-8 h-8 text-primary" />
            <p className="text-sm font-semibold text-foreground">{t.createFlow.sourceIdea}</p>
            <p className="text-xs text-muted-foreground">{t.createFlow.sourceIdeaDesc}</p>
          </CardContent>
        </Card>

        <Card
          className={`p-4 cursor-pointer transition-colors hover-elevate ${activeSource === "remix" ? "border-primary bg-primary/5" : ""}`}
          onClick={() => { setActiveSource("remix"); onSelectRemix(); }}
          data-testid="source-remix"
        >
          <CardContent className="p-0 flex flex-col items-center text-center gap-2">
            <Repeat className="w-8 h-8 text-primary" />
            <p className="text-sm font-semibold text-foreground">{t.createFlow.sourceRemix}</p>
            <p className="text-xs text-muted-foreground">{t.createFlow.sourceRemixDesc}</p>
          </CardContent>
        </Card>
      </div>

      {activeSource === "opportunity" && (
        <div className="flex flex-col gap-3">
          {isLoadingEngine ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-md" />)}
            </div>
          ) : opportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {opportunities.slice(0, 6).map((opp: Opportunity, i: number) => (
                <Card
                  key={i}
                  className="p-4 cursor-pointer hover-elevate"
                  onClick={() => onSelectOpportunity(opp)}
                  data-testid={`card-opp-${i}`}
                >
                  <CardContent className="p-0 space-y-2">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{opp.hook}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {opp.format && <Badge variant="outline" className="text-[10px]">{opp.format.replace(/_/g, " ")}</Badge>}
                      {opp.topic && <Badge variant="secondary" className="text-[10px]">{TOPIC_CLUSTER_LABELS[opp.topic] || opp.topic}</Badge>}
                      <Badge variant="default" className="text-[10px]">{opp.opportunity_score}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Compass className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">{t.createFlow.noOpportunities}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeSource === "idea" && (
        <div className="flex flex-col gap-3">
          {isLoadingSaved ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-md" />)}
            </div>
          ) : savedIdeas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedIdeas.slice(0, 6).map((idea: SavedIdea) => (
                <Card
                  key={idea.id}
                  className="p-4 cursor-pointer hover-elevate"
                  onClick={() => onSelectIdea(idea)}
                  data-testid={`card-idea-${idea.id}`}
                >
                  <CardContent className="p-0 space-y-2">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{idea.hook}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {idea.format && <Badge variant="outline" className="text-[10px]">{idea.format.replace(/_/g, " ")}</Badge>}
                      {idea.topic && <Badge variant="secondary" className="text-[10px]">{TOPIC_CLUSTER_LABELS[idea.topic] || idea.topic}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Lightbulb className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">{t.createFlow.noIdeas}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeSource === "remix" && (
        <Card className="p-5 flex flex-col gap-4">
          <div>
            <Label>{t.remixEngine.contentType}</Label>
            <Select value={remixContentType} onValueChange={setRemixContentType}>
              <SelectTrigger data-testid="select-remix-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="script">{t.remixEngine.script}</SelectItem>
                <SelectItem value="caption">{t.remixEngine.caption}</SelectItem>
                <SelectItem value="hook">{t.remixEngine.hook}</SelectItem>
                <SelectItem value="post">{t.remixEngine.post}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={remixContent}
            onChange={(e: any) => setRemixContent(e.target.value)}
            placeholder={t.remixEngine.inputPlaceholder}
            className="min-h-[120px]"
            data-testid="textarea-remix-content"
          />
          <Button
            onClick={() => remixMutation.mutate()}
            disabled={!remixContent.trim() || remixMutation.isPending}
            className="gap-2"
            data-testid="button-remix"
          >
            {remixMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t.remixEngine.remixing}</>
            ) : (
              <><Sparkles className="w-4 h-4" /> {t.remixEngine.remix}</>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
}

function StepGenerateScript({
  hook, setHook, format, setFormat, topic, setTopic, context, setContext,
  generatedScript, editHook, setEditHook, editStructure, setEditStructure,
  editScript, setEditScript, editCta, setEditCta, generateMutation, t,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-5 flex flex-col gap-4" data-testid="card-script-input">
        <div className="flex items-center gap-2 mb-1">
          <Pencil className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">{t.scriptGenerator.inputSection}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="create-hook">{t.scriptGenerator.hookLabel} *</Label>
          <Input
            id="create-hook"
            data-testid="input-hook"
            value={hook}
            onChange={(e: any) => setHook(e.target.value)}
            placeholder={t.scriptGenerator.hookPlaceholder}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="create-format">{t.scriptGenerator.formatLabel}</Label>
          <Input
            id="create-format"
            data-testid="input-format"
            value={format}
            onChange={(e: any) => setFormat(e.target.value)}
            placeholder={t.scriptGenerator.formatPlaceholder}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="create-topic">{t.scriptGenerator.topicLabel}</Label>
          <Input
            id="create-topic"
            data-testid="input-topic"
            value={topic}
            onChange={(e: any) => setTopic(e.target.value)}
            placeholder={t.scriptGenerator.topicPlaceholder}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="create-context">{t.scriptGenerator.contextLabel}</Label>
          <Textarea
            id="create-context"
            data-testid="input-context"
            value={context}
            onChange={(e: any) => setContext(e.target.value)}
            placeholder={t.scriptGenerator.contextPlaceholder}
            className="resize-none min-h-[80px]"
          />
        </div>

        <Button
          onClick={() => {
            if (!hook.trim()) return;
            generateMutation.mutate();
          }}
          disabled={generateMutation.isPending || !hook.trim()}
          className="gap-2 mt-2"
          data-testid="button-generate-script"
        >
          {generateMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t.scriptGenerator.generating}</>
          ) : (
            <><Sparkles className="w-4 h-4" /> {t.scriptGenerator.generateScript}</>
          )}
        </Button>
      </Card>

      <Card className="p-5 flex flex-col gap-4" data-testid="card-script-output">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">{t.scriptGenerator.outputSection}</span>
          </div>
          {generatedScript && (
            <Badge variant="secondary" className="text-xs">{t.scriptGenerator.editHint}</Badge>
          )}
        </div>

        {generateMutation.isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : generatedScript ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t.scriptGenerator.generatedHook}</Label>
              <Textarea
                data-testid="textarea-edit-hook"
                value={editHook}
                onChange={(e: any) => setEditHook(e.target.value)}
                className="resize-none min-h-[60px]"
              />
            </div>

            {generatedScript.hook_variations && generatedScript.hook_variations.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>{t.scriptGenerator.hookVariations}</Label>
                <div className="space-y-2">
                  {generatedScript.hook_variations.map((variation: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2.5 rounded-md border border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => setEditHook(variation)}
                      data-testid={`hook-variation-${i}`}
                    >
                      <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">
                        {String.fromCharCode(65 + i)}
                      </Badge>
                      <p className="text-sm text-foreground leading-snug">{variation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>{t.scriptGenerator.generatedStructure}</Label>
              <Textarea
                data-testid="textarea-edit-structure"
                value={editStructure}
                onChange={(e: any) => setEditStructure(e.target.value)}
                className="resize-none min-h-[60px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t.scriptGenerator.generatedScript}</Label>
              <Textarea
                data-testid="textarea-edit-script"
                value={editScript}
                onChange={(e: any) => setEditScript(e.target.value)}
                className="resize-none min-h-[160px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t.scriptGenerator.generatedCta}</Label>
              <Textarea
                data-testid="textarea-edit-cta"
                value={editCta}
                onChange={(e: any) => setEditCta(e.target.value)}
                className="resize-none min-h-[60px]"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-2"
              data-testid="button-regenerate"
            >
              <RefreshCw className="w-4 h-4" />
              {t.scriptGenerator.regenerate}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{t.scriptGenerator.description}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function StepBlueprint({
  hook, blueprint, isGenerating, onGenerate,
  updateBlueprintHook, updateScene, updateCTA, t,
}: any) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t.createFlow.step3}</h2>
        </div>
        <Button
          onClick={onGenerate}
          disabled={!hook.trim() || isGenerating}
          className="gap-2"
          data-testid="button-generate-blueprint"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t.videoBuilder.generating}</>
          ) : (
            <><Sparkles className="w-4 h-4" /> {t.videoBuilder.generateBlueprint}</>
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
            <Badge variant="secondary" className="text-xs">{t.videoBuilder.editableHint}</Badge>
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
                  onChange={(e: any) => updateBlueprintHook("text", e.target.value)}
                  data-testid="input-edit-hook-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.visualSuggestion}</label>
                <Textarea
                  value={blueprint.hook.visual_suggestion}
                  onChange={(e: any) => updateBlueprintHook("visual_suggestion", e.target.value)}
                  rows={2}
                  data-testid="input-edit-hook-visual"
                />
              </div>
            </div>
          </Card>

          {blueprint.scenes.map((scene: any, i: number) => (
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
                    onChange={(e: any) => updateScene(i, "description", e.target.value)}
                    rows={2}
                    data-testid={`input-edit-scene-description-${i}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.visualSuggestion}</label>
                  <Textarea
                    value={scene.visual_suggestion}
                    onChange={(e: any) => updateScene(i, "visual_suggestion", e.target.value)}
                    rows={2}
                    data-testid={`input-edit-scene-visual-${i}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.scriptLines}</label>
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
                  onChange={(e: any) => updateCTA("text", e.target.value)}
                  data-testid="input-edit-cta-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t.videoBuilder.visualSuggestion}</label>
                <Textarea
                  value={blueprint.cta.visual_suggestion}
                  onChange={(e: any) => updateCTA("visual_suggestion", e.target.value)}
                  rows={2}
                  data-testid="input-edit-cta-visual"
                />
              </div>
            </div>
          </Card>

          <Button
            variant="outline"
            onClick={onGenerate}
            disabled={isGenerating}
            className="gap-2"
            data-testid="button-regenerate-blueprint"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            {t.videoBuilder.regenerate}
          </Button>
        </div>
      )}

      {!blueprint && !isGenerating && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Video className="w-12 h-12 mb-4 opacity-30" />
            <p>{t.videoBuilder.noBlueprint}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepPredictedViews({
  hook, format, editScript, editCta, prediction, improvement,
  predictMutation, improveMutation, probabilityColor, probabilityBg,
  generatedScript, t,
}: any) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t.createFlow.step4}</h2>
        </div>
        <Button
          onClick={() => predictMutation.mutate()}
          disabled={!hook.trim() || predictMutation.isPending}
          className="gap-2"
          data-testid="button-predict"
        >
          <BarChart3 className="w-4 h-4" />
          {predictMutation.isPending ? t.predictedViews.predicting : t.predictedViews.predict}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          {!prediction && !predictMutation.isPending ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Eye className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">{t.predictedViews.noData}</p>
                <p className="text-sm text-muted-foreground/70 mt-1">{t.predictedViews.noDataHint}</p>
              </CardContent>
            </Card>
          ) : predictMutation.isPending ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BarChart3 className="w-8 h-8 text-primary animate-pulse mb-3" />
                <p className="text-muted-foreground">{t.predictedViews.predicting}</p>
              </CardContent>
            </Card>
          ) : prediction ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t.predictedViews.viralProbability}</p>
                    <div className="relative w-32 h-32 mx-auto">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                        <circle
                          cx="50" cy="50" r="42" fill="none"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${prediction.viral_probability * 2.64} 264`}
                          className={probabilityBg(prediction.viral_probability)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-3xl font-bold ${probabilityColor(prediction.viral_probability)}`} data-testid="text-viral-probability">
                          {prediction.viral_probability}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center w-full pt-4 border-t border-border/50">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{t.predictedViews.predictedRange}</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-predicted-range">
                      {prediction.predicted_views.formatted}
                    </p>
                    {prediction.based_on > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.predictedViews.basedOn.replace("{count}", String(prediction.based_on))}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => improveMutation.mutate()}
                    disabled={improveMutation.isPending}
                    className="gap-2 w-full"
                    data-testid="button-improve"
                  >
                    <Sparkles className="w-4 h-4" />
                    {improveMutation.isPending ? t.predictedViews.improving : t.predictedViews.improve}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          {improvement && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold">{t.predictedViews.improvedHook}</span>
                  </div>
                  <p className="text-sm font-medium bg-primary/5 p-3 rounded-md border border-primary/20" data-testid="text-improved-hook">
                    {improvement.improved_hook}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold">{t.predictedViews.improvedFormat}</span>
                  </div>
                  <p className="text-sm" data-testid="text-improved-format">{improvement.improved_format}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-semibold">{t.predictedViews.improvedCta}</span>
                  </div>
                  <p className="text-sm" data-testid="text-improved-cta">{improvement.improved_cta}</p>
                </CardContent>
              </Card>

              {improvement.tips && improvement.tips.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold">{t.predictedViews.tips}</span>
                    </div>
                    <ul className="space-y-2">
                      {improvement.tips.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-tip-${i}`}>
                          <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">{i + 1}</Badge>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {generatedScript && (
            <ContentScorecard
              hook={hook}
              format={format}
              topic=""
              script={editScript}
              cta={editCta}
              visible={!!generatedScript}
            />
          )}
        </div>
      </div>
    </div>
  );
}
