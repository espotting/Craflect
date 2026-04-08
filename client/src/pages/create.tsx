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

interface PatternData {
  pattern_id: string;
  pattern_label: string;
  hook_template: string | null;
  structure_template: string | null;
  optimal_duration: number | null;
  why_it_works: string | null;
  best_for: string | null;
  content_angle: string | null;
  cta_suggestion: string | null;
  trend_status: string | null;
  velocity_7d: number | null;
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

function StructureGuide({ pattern }: { pattern: PatternData }) {
  if (!pattern.structure_template) return null;
  const steps = pattern.structure_template.split(/\n|(?:\d+[\.\)]\s)/).filter(s => s.trim());

  return (
    <Card className="bg-slate-900/50 border-slate-800 border-l-2 border-l-purple-500">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-white">
            <Layers className="h-4 w-4 text-purple-400" />
            Recommended Structure
          </h3>
          {pattern.pattern_label && (
            <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
              {pattern.pattern_label}
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/50">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-slate-300">{step.trim()}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          {pattern.optimal_duration && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {pattern.optimal_duration}s optimal
            </div>
          )}
          {pattern.best_for && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Target className="w-3 h-3" />
              {pattern.best_for}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StepIdea({
  hook, setHook,
  format, setFormat,
  topic, setTopic,
  context, setContext,
  oppContext,
  patternData,
  t,
}: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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
                {patternData?.hook_template && hook !== patternData.hook_template && (
                  <button
                    onClick={() => setHook(patternData.hook_template)}
                    className="mt-1.5 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    data-testid="button-use-template"
                  >
                    <Sparkles className="w-3 h-3" />
                    Use pattern template: "{patternData.hook_template}"
                  </button>
                )}
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

      {patternData && <StructureGuide pattern={patternData} />}
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
                <Megaphone className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-green-400">CTA</span>
              </div>
              <Textarea
                value={blueprint.cta.text}
                onChange={(e) => updateCTA("text", e.target.value)}
                className="min-h-[40px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 text-white"
                data-testid="edit-bp-cta"
              />
              <p className="text-[10px] text-slate-500 mt-1">Visual: {blueprint.cta.visual_suggestion}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed border-slate-700 bg-slate-900/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <Video className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">
              {t.createFlow?.clickGenerateBlueprint || 'Click "Generate Blueprint" to plan your video'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Step 3 — Export ──────────────────────────────────────────────────────────

function StepExport({
  script, blueprint,
  editHookLine, editScene1, editScene2, editScene3, editCta,
  hook, format, topic,
  copied, onCopy, onDownload,
  isFreePlan, onShowNextActions,
  oppContext,
  t,
}: any) {
  const [, navigate] = useLocation();

  const handleTrack = () => {
    // Naviguer vers la page Performance avec le contexte du projet
    // La page Performance sera implémentée dans une prochaine itération
    navigate("/performance?from=studio");
  };

  if (isFreePlan) {
    return (
      <div className="space-y-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6 space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {t.createFlow?.paywallTitle || "Your viral video is ready!"}
              </h3>
              <p className="text-slate-400">
                {t.createFlow?.paywallDesc || "Export requires a Creator or Pro plan"}
              </p>
            </div>

            {script && (
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Preview</p>
                <p className="text-sm text-white font-medium">"{editHookLine || script.hook_line}"</p>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{editScene1 || script.scene_1}</p>
              </div>
            )}

            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-lg"
              onClick={onShowNextActions}
              data-testid="button-upgrade-export"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t.createFlow?.upgradeToExport || "Upgrade to Export"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 space-y-4">
          <div className="text-center py-2">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">
              {t.createFlow?.readyToExport || "Your viral video is ready!"}
            </h3>
            {oppContext?.viralityScore && (
              <p className="text-sm text-purple-300 mt-1">
                Predicted score: <span className="font-semibold">{oppContext.viralityScore}</span>
                {oppContext.videoCount && ` · based on ${oppContext.videoCount} videos`}
              </p>
            )}
          </div>

          {/* Script preview */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 max-h-60 overflow-y-auto">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
              {`Hook: ${hook}\nFormat: ${formatLabel(format)}\nTopic: ${formatLabel(topic)}`}
              {script && `\n\n[HOOK]\n${editHookLine || script.hook_line}\n\n[SCENE 1]\n${editScene1 || script.scene_1}\n\n[SCENE 2]\n${editScene2 || script.scene_2}\n\n[SCENE 3]\n${editScene3 || script.scene_3}\n\n[CTA]\n${editCta || script.cta}`}
            </pre>
          </div>

          {/* Export buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onCopy}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300"
              data-testid="button-copy"
            >
              {copied
                ? <><Check className="w-4 h-4 mr-2" />{t.createFlow?.copied || "Copied!"}</>
                : <><Copy className="w-4 h-4 mr-2" />{t.createFlow?.copyClipboard || "Copy"}</>
              }
            </Button>
            <Button
              onClick={onDownload}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300"
              data-testid="button-download"
            >
              <Download className="w-4 h-4 mr-2" />{t.createFlow?.downloadTxt || "Download"}
            </Button>
          </div>

          {/* Track performance — ferme la boucle */}
          <div className="pt-2 border-t border-slate-700 space-y-3">
            <p className="text-xs text-slate-400 text-center">
              Once you publish, come back to track your actual performance
            </p>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleTrack}
              data-testid="button-track-performance"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Track this video's performance
            </Button>
            <Button
              variant="outline"
              className="w-full border-slate-700 text-slate-300"
              onClick={onShowNextActions}
              data-testid="button-done"
            >
              <CheckCircle className="w-4 h-4 mr-2" />{t.createFlow?.done || "Done"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Next Actions screen ──────────────────────────────────────────────────────

function NextActionsScreen({ onReset, t }: any) {
  const [, navigate] = useLocation();
  const actions = [
    {
      icon: Sparkles,
      title: t.createFlow?.nextAction1 || "Create Another Video",
      desc: t.createFlow?.nextAction1Desc || "Start a new viral video project",
      action: onReset,
      color: "from-purple-500 to-fuchsia-500",
    },
    {
      icon: TrendingUp,
      title: "Track Performance",
      desc: "See how your video is performing vs prediction",
      action: () => navigate("/performance"),
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: Eye,
      title: t.createFlow?.nextAction2 || "Browse Opportunities",
      desc: t.createFlow?.nextAction2Desc || "Find more viral content ideas",
      action: () => navigate("/opportunities"),
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: FileText,
      title: t.createFlow?.nextAction3 || "View Workspace",
      desc: t.createFlow?.nextAction3Desc || "See all your projects",
      action: () => navigate("/workspace"),
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="space-y-4" data-testid="next-actions">
      <h3 className="text-lg font-bold text-white text-center">
        {t.createFlow?.whatsNext || "What's Next?"}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((a, i) => (
          <Card
            key={i}
            className="bg-slate-900/50 border-slate-800 hover:border-purple-500/30 transition-all cursor-pointer group"
            onClick={a.action}
            data-testid={`next-action-${i}`}
          >
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <a.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm">{a.title}</h4>
                <p className="text-slate-400 text-xs mt-1">{a.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CreatePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  const STEP_LABELS = [
    t.createFlow?.step1 || "Idea",
    t.createFlow?.step2 || "Script",
    t.createFlow?.step3 || "Blueprint",
    t.createFlow?.step4 || "Export",
  ];

  // Studio state
  const [selectedMode, setSelectedMode] = useState<StudioMode | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Idea fields
  const [hook, setHook] = useState("");
  const [format, setFormat] = useState("");
  const [topic, setTopic] = useState("");
  const [structure, setStructure] = useState("");
  const [context, setContext] = useState("");

  // Contexte transmis depuis Opportunities (nouveau)
  const [oppContext, setOppContext] = useState<OpportunityContext>({});

  // Script state
  const [script, setScript] = useState<StructuredScript | null>(null);
  const [editHookLine, setEditHookLine] = useState("");
  const [editScene1, setEditScene1] = useState("");
  const [editScene2, setEditScene2] = useState("");
  const [editScene3, setEditScene3] = useState("");
  const [editCta, setEditCta] = useState("");

  // Blueprint state
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);

  // Export state
  const [copied, setCopied] = useState(false);
  const [showNextActions, setShowNextActions] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const autoSavedRef = useRef(false);

  // Pattern data (fetched when patternId is available)
  const [patternData, setPatternData] = useState<PatternData | null>(null);

  // Data
  const { data: credits, refetch: refetchCredits } = useQuery<CreditsInfo>({ queryKey: ["/api/credits"] });
  const { data: projects } = useQuery<ProjectItem[]>({ queryKey: ["/api/projects"] });

  // Lire les query params au montage — y compris le contexte Opportunity
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const qHook = params.get("hook");
    const qFormat = params.get("format");
    const qTopic = params.get("topic");
    const qStructure = params.get("structure");

    // Nouveau : contexte depuis Opportunities
    const qScore = params.get("viralityScore");
    const qVideoCount = params.get("videoCount");
    const qWhyItWorks = params.get("whyItWorks");
    const qPatternId = params.get("patternId");
    const qConfidence = params.get("confidence");

    if (qHook) {
      setHook(qHook);
      setSelectedMode("opportunity");
    }
    if (qFormat) setFormat(qFormat);
    if (qTopic) setTopic(qTopic);
    if (qStructure) setStructure(qStructure);

    // Stocker le contexte Opportunity
    if (qScore || qVideoCount || qWhyItWorks) {
      setOppContext({
        viralityScore: qScore ? Number(qScore) : undefined,
        videoCount: qVideoCount ? Number(qVideoCount) : undefined,
        whyItWorks: qWhyItWorks ? decodeURIComponent(qWhyItWorks) : undefined,
        patternId: qPatternId || undefined,
        confidence: qConfidence ? Number(qConfidence) : undefined,
      });
    }

    // Fetch pattern data if patternId is provided
    if (qPatternId) {
      fetch(`/api/patterns/${qPatternId}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then((data: PatternData | null) => {
          if (data) {
            setPatternData(data);
            if (data.hook_template && !qHook) {
              setHook(data.hook_template);
            }
            if (data.why_it_works && !qWhyItWorks) {
              setOppContext(prev => ({ ...prev, whyItWorks: data.why_it_works || undefined }));
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Sync script vers champs éditables
  useEffect(() => {
    if (script) {
      setEditHookLine(script.hook_line || "");
      setEditScene1(script.scene_1 || "");
      setEditScene2(script.scene_2 || "");
      setEditScene3(script.scene_3 || "");
      setEditCta(script.cta || "");
    }
  }, [script]);

  // Generate script mutation
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
        toast({
          title: t.createFlow?.notEnoughCredits || "Not enough credits",
          description: t.createFlow?.notEnoughCreditsDesc || "",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: "Failed to generate script", variant: "destructive" });
      }
    },
  });

  // Auto-save project
  async function autoSaveProject(scriptData?: StructuredScript) {
    if (autoSavedRef.current) return;
    try {
      const s = scriptData || script;
      await apiRequest("POST", "/api/projects", {
        title: (hook || "Untitled").substring(0, 80),
        hook,
        format: format || undefined,
        topic: topic || undefined,
        script: s
          ? { hook_line: s.hook_line, scene_1: s.scene_1, scene_2: s.scene_2, scene_3: s.scene_3, cta: s.cta, structure: s.structure }
          : undefined,
        blueprint: blueprint || undefined,
        status: "draft",
      });
      autoSavedRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } catch {}
  }

  // Generate blueprint
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
        toast({
          title: t.createFlow?.notEnoughCredits || "Not enough credits",
          description: t.createFlow?.notEnoughCreditsDesc || "",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: "Failed to generate blueprint", variant: "destructive" });
      }
    } finally {
      setIsGeneratingBlueprint(false);
    }
  }

  // Blueprint updaters
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

  // Export helpers
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
    toast({ title: t.createFlow?.copied || "Copied!" });
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

  function handleReset() {
    setSelectedMode(null);
    setCurrentStep(0);
    setHook(""); setFormat(""); setTopic(""); setStructure(""); setContext("");
    setOppContext({});
    setPatternData(null);
    setScript(null); setBlueprint(null);
    setEditHookLine(""); setEditScene1(""); setEditScene2(""); setEditScene3(""); setEditCta("");
    setCopied(false); setShowNextActions(false);
    autoSavedRef.current = false;
  }

  function handleExportAttempt() {
    if (isFreePlan) {
      setShowPaywall(true);
    } else {
      setShowNextActions(true);
    }
  }

  // ── Render: Studio Selection ──
  if (!selectedMode) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-8 max-w-6xl mx-auto" data-testid="page-create">
          <StudioSelection
            onSelectMode={setSelectedMode}
            recentProjects={projects || []}
            credits={credits}
          />
        </div>
      </DashboardLayout>
    );
  }

  // ── Render: Studio Flow ──
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto" data-testid="page-create">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              className="border-slate-700"
              data-testid="button-back-studio"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white" data-testid="text-create-title">
                {t.createFlow?.title || "Create Viral Video"}
              </h1>
              <p className="text-sm text-slate-400" data-testid="text-create-subtitle">
                {t.createFlow?.subtitle || "From idea to export in 4 steps"}
              </p>
            </div>
          </div>
          {credits && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800" data-testid="credits-display">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">{credits.credits}</span>
              <span className="text-xs text-slate-400">/ {credits.maxCredits}</span>
            </div>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 flex-wrap" data-testid="stepper">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  i === currentStep
                    ? "bg-purple-600 text-white"
                    : i < currentStep
                      ? "bg-purple-500/20 text-purple-300 cursor-pointer"
                      : "bg-slate-800 text-slate-500"
                }`}
                data-testid={`step-${i}`}
              >
                {i < currentStep
                  ? <CheckCircle className="w-3.5 h-3.5" />
                  : <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">{i + 1}</span>
                }
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEP_LABELS.length - 1 && <div className="w-6 h-px bg-slate-700" />}
            </div>
          ))}
        </div>

        {/* Steps */}
        {currentStep === 0 && (
          <StepIdea
            hook={hook} setHook={setHook}
            format={format} setFormat={setFormat}
            topic={topic} setTopic={setTopic}
            context={context} setContext={setContext}
            oppContext={oppContext}
            patternData={patternData}
            t={t}
          />
        )}
        {currentStep === 1 && (
          <StepScript
            script={script}
            editHookLine={editHookLine} setEditHookLine={setEditHookLine}
            editScene1={editScene1} setEditScene1={setEditScene1}
            editScene2={editScene2} setEditScene2={setEditScene2}
            editScene3={editScene3} setEditScene3={setEditScene3}
            editCta={editCta} setEditCta={setEditCta}
            generateScriptMutation={generateScriptMutation}
            credits={credits}
            t={t}
          />
        )}
        {currentStep === 2 && (
          <StepBlueprint
            blueprint={blueprint}
            isGenerating={isGeneratingBlueprint}
            onGenerate={handleGenerateBlueprint}
            updateBlueprintHook={updateBlueprintHook}
            updateScene={updateScene}
            updateCTA={updateCTA}
            credits={credits}
            t={t}
          />
        )}
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
              isFreePlan={!!isFreePlan}
              onShowNextActions={handleExportAttempt}
              oppContext={oppContext}
              t={t}
            />
          )
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => currentStep === 0 ? handleReset() : setCurrentStep(Math.max(0, currentStep - 1))}
            className="border-slate-700 text-slate-300"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {currentStep === 0
              ? (t.studio?.backToModes || "Back to Studio")
              : (t.createFlow?.back || "Back")}
          </Button>
          {currentStep < 3 && (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canGoNext()}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-next"
            >
              {t.createFlow?.next || "Next Step"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        currentPlan={credits?.plan || "free"}
      />
    </DashboardLayout>
  );
}
