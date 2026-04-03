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
