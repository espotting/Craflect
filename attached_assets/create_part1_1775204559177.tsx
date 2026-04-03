import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSearch, useLocation } from "wouter";
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
  Loader2,
  RefreshCw,
  Pencil,
  Megaphone,
  CheckCircle,
  Copy,
  Download,
  Check,
  Coins,
  ChevronLeft,
  Lightbulb,
  Layers,
  User,
  Film,
  Clock,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
} from "lucide-react";
import { getPredictedViews, getViralityColor } from "@/lib/predicted-views";
import { PaywallModal } from "@/components/paywall-modal";
import { StatusBadge } from "@/components/status-badge";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StructuredScript {
  hook_line: string;
  scene_1: string;
  scene_2: string;
  scene_3: string;
  cta: string;
  hook_variations?: string[];
  structure?: string;
}

interface BlueprintHook { text: string; visual_suggestion: string; }
interface BlueprintScene { title: string; description: string; visual_suggestion: string; script_lines: string; }
interface BlueprintCTA { text: string; visual_suggestion: string; }
interface Blueprint { hook: BlueprintHook; scenes: BlueprintScene[]; cta: BlueprintCTA; }

interface CreditsInfo {
  credits: number;
  maxCredits: number;
  plan: string;
  costs: Record<string, number>;
  estimatedVideos: number;
}

interface ProjectItem {
  project_id: string;
  title: string;
  hook: string;
  format: string;
  status: string;
  created_at: string;
}

// Données de contexte transmises depuis la page Opportunities
interface OpportunityContext {
  viralityScore?: number;
  videoCount?: number;
  whyItWorks?: string;
  patternId?: string;
  confidence?: number;
}

// Réponse de l'API predict/views
interface PredictResponse {
  viral_probability: number;
  predicted_views: { low: number; high: number; formatted: string };
  based_on: number;
}

type StudioMode = "opportunity" | "script-to-video" | "templates" | "avatar" | "remix";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLabel(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Studio mode cards ───────────────────────────────────────────────────────

const studioModes = [
  {
    id: "opportunity" as StudioMode,
    icon: Lightbulb,
    title: "Start from Viral Opportunity",
    titleKey: "modeOpportunity",
    description: "Use a viral opportunity from our database as your starting point",
    descKey: "modeOpportunityDesc",
    badge: "Recommended",
    color: "from-purple-500 to-fuchsia-500",
  },
  {
    id: "script-to-video" as StudioMode,
    icon: FileText,
    title: "Script to Video",
    titleKey: "modeScript",
    description: "Turn your script into a complete video blueprint",
    descKey: "modeScriptDesc",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "templates" as StudioMode,
    icon: Layers,
    title: "Viral Templates",
    titleKey: "modeTemplates",
    description: "Start from proven templates ready to customize",
    descKey: "modeTemplatesDesc",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "avatar" as StudioMode,
    icon: User,
    title: "AI Avatar",
    titleKey: "modeAvatar",
    description: "Create videos with your AI-generated avatar",
    descKey: "modeAvatarDesc",
    badge: "Popular",
    color: "from-orange-500 to-amber-500",
  },
  {
    id: "remix" as StudioMode,
    icon: Film,
    title: "Video Remix",
    titleKey: "modeRemix",
    description: "Transform existing videos with AI enhancements",
    descKey: "modeRemixDesc",
    badge: "Pro",
    disabled: true,
    color: "from-pink-500 to-rose-500",
  },
];

// ─── Studio Selection screen ──────────────────────────────────────────────────

function StudioSelection({
  onSelectMode,
  recentProjects,
  credits,
}: {
  onSelectMode: (mode: StudioMode) => void;
  recentProjects: ProjectItem[];
  credits: CreditsInfo | undefined;
}) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white" data-testid="text-studio-title">
            {t.studio?.title || "Studio Creation"}
          </h2>
          <p className="text-slate-400">{t.studio?.subtitle || "Choose your creation mode"}</p>
        </div>
        {credits && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800" data-testid="credits-display">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">{credits.credits}</span>
            <span className="text-xs text-slate-400">/ {credits.maxCredits}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6" data-testid="studio-modes">
        {studioModes.map((mode) => (
          <div
            key={mode.id}
            onClick={() => !(mode as any).disabled && onSelectMode(mode.id)}
            className={`relative bg-slate-900/50 rounded-2xl p-6 border transition-all ${
              (mode as any).disabled
                ? "opacity-50 cursor-not-allowed border-slate-800"
                : "border-slate-800 hover:border-purple-500/50 cursor-pointer group"
            }`}
            data-testid={`mode-${mode.id}`}
          >
            {mode.badge && (
              <span className={`absolute top-4 right-4 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                mode.badge === "Pro"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  : mode.badge === "Popular"
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                    : "bg-green-500/20 text-green-400 border-green-500/30"
              }`}>
                {mode.badge === "Pro" ? (t.studio?.comingSoon || "Coming Soon") : mode.badge}
              </span>
            )}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <mode.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              {(t.studio as any)?.[mode.titleKey] || mode.title}
            </h3>
            <p className="text-slate-400 text-sm">
              {(t.studio as any)?.[mode.descKey] || mode.description}
            </p>
            {!(mode as any).disabled && (
              <div className="mt-4 flex items-center text-purple-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                {t.studio?.startCreating || "Start Creating"}
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            )}
          </div>
        ))}
      </div>

      {recentProjects.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-4">{t.studio?.recentProjects || "Recent Projects"}</h3>
          <div className="grid grid-cols-4 gap-4">
            {recentProjects.slice(0, 4).map((project) => (
              <div
                key={project.project_id}
                className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 hover:border-purple-500/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/create?hook=${encodeURIComponent(project.hook || "")}&format=${encodeURIComponent(project.format || "")}`)}
                data-testid={`project-${project.project_id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <StatusBadge status={(project.status as any) || "idea"} />
                </div>
                <p className="text-white font-medium text-sm line-clamp-2 mb-2">{project.hook || project.title}</p>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/20 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
        <div>
          <p className="text-blue-300 font-medium text-sm">{t.studio?.proTipTitle || "Pro Tip"}</p>
          <p className="text-blue-400/80 text-sm">
            {t.studio?.proTip || 'Start with "Viral Opportunity" for the best results. Our AI analyzes 50,000+ videos to find the patterns that work in your niche.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Live score panel (Step 0) ────────────────────────────────────────────────

function LiveScorePanel({
  hook,
  format,
  topic,
  oppContext,
  t,
}: {
  hook: string;
  format: string;
  topic: string;
  oppContext: OpportunityContext;
  t: any;
}) {
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const debouncedHook = useDebounce(hook, 600);

  useEffect(() => {
    if (!debouncedHook.trim()) {
      setPrediction(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiRequest("POST", "/api/predict/views", {
      hook: debouncedHook,
      format: format || undefined,
      topic: topic || undefined,
    })
      .then((res) => res.json())
      .then((data: PredictResponse) => {
        if (!cancelled) setPrediction(data);
      })
      .catch(() => {
        // silently fail — keep previous prediction
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedHook, format, topic]);

  // Score à afficher : préférer la prédiction live, sinon le contexte Opportunity
  const score = prediction?.viral_probability ?? oppContext.viralityScore ?? null;
  const viewsLabel = prediction?.predicted_views?.formatted ?? null;
  const basedOn = prediction?.based_on ?? oppContext.videoCount ?? null;
  const viralityColorClass = getViralityColor(score);

  return (
    <Card className="bg-slate-900/50 border-slate-800 h-full">
      <CardContent className="p-5 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-white">
          <BarChart3 className="h-4 w-4 text-purple-400" />
          {t.createFlow?.predictedScore || "Viral Score"}
        </h3>

        {!hook.trim() ? (
          <p className="text-sm text-slate-500 text-center py-8">
            {t.createFlow?.enterHookPreview || "Enter a hook to see your score"}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Hook preview */}
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-sm font-medium text-white">"{hook}"</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {format && <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">{formatLabel(format)}</Badge>}
                {topic && <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">{formatLabel(topic)}</Badge>}
              </div>
            </div>

            {/* Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700 relative">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  </div>
                )}
                <div className={`text-2xl font-bold ${viralityColorClass}`} data-testid="live-virality-score">
                  {score !== null ? Math.round(score) : "—"}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{t.createFlow?.predictedScore || "Predicted Score"}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm font-semibold text-white" data-testid="live-predicted-views">
                  {viewsLabel ?? (score !== null ? getPredictedViews(score).label : "—")}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{t.createFlow?.estViews || "Est. Views"}</div>
              </div>
            </div>

            {/* Source data — le différenciateur Craflect */}
            {basedOn !== null && basedOn > 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <Target className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-purple-300">
                  Based on <span className="font-semibold">{basedOn} real videos</span> analyzed in your niche
                  {oppContext.confidence && ` · ${oppContext.confidence}% confidence`}
                </p>
              </div>
            )}

            {/* Why it works — contexte depuis Opportunity */}
            {oppContext.whyItWorks && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700">
                <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-300">
                  <span className="text-amber-400 font-medium">Why it works: </span>
                  {oppContext.whyItWorks}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Step 0 — Idea ────────────────────────────────────────────────────────────

function StepIdea({
  hook, setHook,
  format, setFormat,
  topic, setTopic,
  context, setContext,
  oppContext,
  t,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Input form */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-300">Hook *</Label>
              <Input
                placeholder='e.g. "3 AI tools nobody talks about"'
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white"
                data-testid="input-hook"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-300">Format</Label>
                <Input
                  placeholder="e.g. Listicle, Tutorial"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  data-testid="input-format"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-300">Topic</Label>
                <Input
                  placeholder="e.g. AI Tools"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  data-testid="input-topic"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-300">Context</Label>
              <Textarea
                placeholder="Additional context for better AI results..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="mt-1 h-20 bg-slate-800 border-slate-700 text-white"
                data-testid="input-context"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live score panel */}
      <div className="lg:col-span-2">
        <LiveScorePanel
          hook={hook}
          format={format}
          topic={topic}
          oppContext={oppContext}
          t={t}
        />
      </div>
    </div>
  );
}

// ─── Step 1 — Script ──────────────────────────────────────────────────────────

function ScriptSection({ icon: Icon, label, color, value, onChange, testId }: any) {
  const colorMap: Record<string, string> = {
    violet: "border-violet-500/20 bg-violet-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    red: "border-red-500/20 bg-red-500/5",
  };
  const labelColorMap: Record<string, string> = {
    violet: "text-violet-400", blue: "text-blue-400", emerald: "text-emerald-400",
    amber: "text-amber-400", red: "text-red-400",
  };
  return (
    <Card className={`border ${colorMap[color] || ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${labelColorMap[color] || ""}`} />
          <span className={`text-xs font-medium ${labelColorMap[color] || ""}`}>{label}</span>
          <Badge variant="outline" className="text-[10px] ml-auto border-slate-600 text-slate-400">
            <Pencil className="w-2.5 h-2.5 mr-1" />Editable
          </Badge>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[60px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 text-white"
          data-testid={testId}
        />
      </CardContent>
    </Card>
  );
}

function StepScript({
  script, editHookLine, setEditHookLine,
  editScene1, setEditScene1, editScene2, setEditScene2,
  editScene3, setEditScene3, editCta, setEditCta,
  generateScriptMutation, credits, t,
}: any) {
  const scriptCost = credits?.costs?.script || 1;
  const hasEnoughCredits = credits ? credits.credits >= scriptCost : true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => generateScriptMutation.mutate()}
            disabled={generateScriptMutation.isPending || !hasEnoughCredits}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-generate-script"
          >
            {generateScriptMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.createFlow?.generating || "Generating..."}</>
              : script
                ? <><RefreshCw className="w-4 h-4 mr-2" />{t.createFlow?.regenerateScript || "Regenerate Script"}</>
                : <><Sparkles className="w-4 h-4 mr-2" />{t.createFlow?.generateScript || "Generate Script"}</>
            }
          </Button>
          <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
            <Coins className="h-3 w-3 mr-1" />{scriptCost} credit{scriptCost > 1 ? "s" : ""}
          </Badge>
        </div>
        {!hasEnoughCredits && (
          <p className="text-xs text-red-400">{t.createFlow?.notEnoughCredits || "Not enough credits"}</p>
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
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-400 mb-2">
                  {t.createFlow?.alternativeHooks || "Alternative Hooks"}
                </p>
                <div className="space-y-2">
                  {script.hook_variations.map((v: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setEditHookLine(v)}
                      className="w-full text-left p-2 rounded-md text-sm hover:bg-slate-800/50 transition-colors border border-slate-700 text-white"
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
        <Card className="border-dashed border-slate-700 bg-slate-900/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <FileText className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">
              {t.createFlow?.clickGenerateScript || 'Click "Generate Script" to create your viral video script'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Step 2 — Blueprint ───────────────────────────────────────────────────────

function StepBlueprint({
  blueprint, isGenerating, onGenerate,
  updateBlueprintHook, updateScene, updateCTA,
  credits, t,
}: any) {
  const blueprintCost = credits?.costs?.blueprint || 1;
  const hasEnoughCredits = credits ? credits.credits >= blueprintCost : true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={onGenerate}
            disabled={isGenerating || !hasEnoughCredits}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-generate-blueprint"
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.createFlow?.generating || "Generating..."}</>
              : blueprint
                ? <><RefreshCw className="w-4 h-4 mr-2" />{t.createFlow?.regenerateBlueprint || "Regenerate Blueprint"}</>
                : <><Video className="w-4 h-4 mr-2" />{t.createFlow?.generateBlueprint || "Generate Blueprint"}</>
            }
          </Button>
          <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
            <Coins className="h-3 w-3 mr-1" />{blueprintCost} credit{blueprintCost > 1 ? "s" : ""}
          </Badge>
        </div>
        {!hasEnoughCredits && (
          <p className="text-xs text-red-400">{t.createFlow?.notEnoughCredits || "Not enough credits"}</p>
        )}
      </div>

      {blueprint ? (
        <div className="space-y-3">
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-purple-400">Hook</span>
              </div>
              <Textarea
                value={blueprint.hook.text}
                onChange={(e) => updateBlueprintHook("text", e.target.value)}
                className="min-h-[40px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 text-white"
                data-testid="edit-bp-hook"
              />
              <p className="text-[10px] text-slate-500 mt-1">Visual: {blueprint.hook.visual_suggestion}</p>
            </CardContent>
          </Card>

          {blueprint.scenes.map((scene: BlueprintScene, i: number) => (
            <Card key={i} className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-blue-400">Scene {i + 1}: {scene.title}</span>
                </div>
                <Textarea
                  value={scene.description}
                  onChange={(e) => updateScene(i, "description", e.target.value)}
                  className="min-h-[40px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 text-white mb-1"
                  data-testid={`edit-bp-scene-${i}`}
                />
                <p className="text-[10px] text-slate-500">Visual: {scene.visual_suggestion}</p>
                <p className="text-[10px] text-slate-500">Script: {scene.script_lines}</p>
              </CardContent>
            </Card>
          ))}

          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
