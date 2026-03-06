import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { TOPIC_CLUSTER_LABELS, type SavedIdea } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Lightbulb,
  Bookmark,
  Compass,
  FileText,
  Video,
  Zap,
  TrendingUp,
  Eye,
  X,
  Sparkles,
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

interface OpportunityEngineResponse {
  opportunities: Opportunity[];
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

function formatTopic(topic: string | null | undefined) {
  if (!topic) return "—";
  return TOPIC_CLUSTER_LABELS[topic] || topic.replace(/_/g, " ");
}

function formatNumber(n: number | null | undefined) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function OpportunityCard({
  hook,
  format,
  topic,
  opportunityScore,
  velocity,
  videosDetected,
  onSave,
  onCreateScript,
  onCreateVideo,
  isSaving,
  testId,
}: {
  hook: string;
  format: string | null | undefined;
  topic: string | null | undefined;
  opportunityScore: number;
  velocity: number;
  videosDetected: number;
  onSave: () => void;
  onCreateScript: () => void;
  onCreateVideo: () => void;
  isSaving: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground line-clamp-2" data-testid={`${testId}-hook`}>
              {hook}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {format && (
                <Badge variant="outline" className="text-[10px]" data-testid={`${testId}-format`}>
                  {format.replace(/_/g, " ")}
                </Badge>
              )}
              {topic && (
                <Badge variant="secondary" className="text-[10px]" data-testid={`${testId}-topic`}>
                  {formatTopic(topic)}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 text-center">
            <p className={`text-2xl font-bold ${getScoreColor(opportunityScore)}`} data-testid={`${testId}-score`}>
              {opportunityScore}
            </p>
            <Badge variant={getScoreBadgeVariant(opportunityScore)} className="text-[9px] mt-1">
              {getScoreLabel(opportunityScore)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" data-testid={`${testId}-velocity`}>
            <TrendingUp className="w-3 h-3" />
            {velocity.toFixed(1)} vel.
          </span>
          <span className="flex items-center gap-1" data-testid={`${testId}-videos`}>
            <Eye className="w-3 h-3" />
            {videosDetected} videos
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onSave} disabled={isSaving} data-testid={`${testId}-save`}>
            <Bookmark className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onCreateScript} data-testid={`${testId}-script`}>
            <FileText className="w-3 h-3 mr-1" />
            Script
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onCreateVideo} data-testid={`${testId}-video`}>
            <Video className="w-3 h-3 mr-1" />
            Video
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SavedIdeaCard({
  idea,
  onCreateScript,
  onCreateVideo,
  onDismiss,
  isDismissing,
  testId,
}: {
  idea: SavedIdea;
  onCreateScript: () => void;
  onCreateVideo: () => void;
  onDismiss: () => void;
  isDismissing: boolean;
  testId: string;
}) {
  const score = idea.opportunityScore || 0;
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground line-clamp-2" data-testid={`${testId}-hook`}>
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
              <p className={`text-2xl font-bold ${getScoreColor(score)}`} data-testid={`${testId}-score`}>
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
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onCreateScript} data-testid={`${testId}-script`}>
            <FileText className="w-3 h-3 mr-1" />
            Script
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onCreateVideo} data-testid={`${testId}-video`}>
            <Video className="w-3 h-3 mr-1" />
            Video
          </Button>
          <Button variant="ghost" size="icon" onClick={onDismiss} disabled={isDismissing} data-testid={`${testId}-dismiss`}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IdeasPage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"discovered" | "saved">("discovered");

  const { data: engineData, isLoading: isLoadingEngine } = useQuery<OpportunityEngineResponse>({
    queryKey: ["/api/opportunities/engine"],
  });

  const { data: savedIdeas, isLoading: isLoadingSaved } = useQuery<SavedIdea[]>({
    queryKey: ["/api/ideas"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { hook: string; format?: string; topic?: string; opportunityScore?: number; velocity?: number; videosDetected?: number }) => {
      await apiRequest("POST", "/api/ideas/save", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({ title: "Idea saved", description: "The idea has been added to your collection." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save idea.", variant: "destructive" });
    },
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

  const opportunities = engineData?.opportunities || [];
  const activeSavedIdeas = (savedIdeas || []).filter((i) => i.status === "saved");
  const isLoading = activeTab === "discovered" ? isLoadingEngine : isLoadingSaved;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-md" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground" data-testid="text-ideas-title">
              Ideas
            </h1>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-ideas-subtitle">
            Auto-generated viral opportunities and your saved ideas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap" data-testid="tabs-ideas">
          <Button
            variant={activeTab === "discovered" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("discovered")}
            data-testid="tab-discovered"
          >
            <Compass className="w-3.5 h-3.5 mr-1.5" />
            Discovered
            {opportunities.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {opportunities.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "saved" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("saved")}
            data-testid="tab-saved"
          >
            <Bookmark className="w-3.5 h-3.5 mr-1.5" />
            Saved
            {activeSavedIdeas.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {activeSavedIdeas.length}
              </Badge>
            )}
          </Button>
        </div>

        {activeTab === "discovered" && (
          <>
            {opportunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-discovered">
                {opportunities.map((opp, i) => (
                  <OpportunityCard
                    key={i}
                    hook={opp.hook}
                    format={opp.format}
                    topic={opp.topic}
                    opportunityScore={opp.opportunity_score}
                    velocity={opp.velocity}
                    videosDetected={opp.videos_detected}
                    onSave={() =>
                      saveMutation.mutate({
                        hook: opp.hook,
                        format: opp.format,
                        topic: opp.topic,
                        opportunityScore: opp.opportunity_score,
                        velocity: opp.velocity,
                        videosDetected: opp.videos_detected,
                      })
                    }
                    onCreateScript={() => navigateToScript(opp.hook, opp.format, opp.topic)}
                    onCreateVideo={() => navigateToVideo(opp.hook, opp.format, opp.topic)}
                    isSaving={saveMutation.isPending}
                    testId={`card-opportunity-${i}`}
                  />
                ))}
              </div>
            ) : (
              <Card data-testid="card-no-opportunities">
                <CardContent className="p-12 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-primary/40" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-no-opportunities-title">
                    No opportunities yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md" data-testid="text-no-opportunities-desc">
                    The engine analyzes viral patterns to surface high-potential content ideas. Check back soon as more videos are analyzed.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "saved" && (
          <>
            {activeSavedIdeas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-saved">
                {activeSavedIdeas.map((idea) => (
                  <SavedIdeaCard
                    key={idea.id}
                    idea={idea}
                    onCreateScript={() => navigateToScript(idea.hook, idea.format, idea.topic)}
                    onCreateVideo={() => navigateToVideo(idea.hook, idea.format, idea.topic)}
                    onDismiss={() => dismissMutation.mutate(idea.id)}
                    isDismissing={dismissMutation.isPending}
                    testId={`card-idea-${idea.id}`}
                  />
                ))}
              </div>
            ) : (
              <Card data-testid="card-no-saved">
                <CardContent className="p-12 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Bookmark className="w-7 h-7 text-primary/40" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1" data-testid="text-no-saved-title">
                    No saved ideas yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md" data-testid="text-no-saved-desc">
                    Save interesting opportunities from the Discovered tab to build your idea collection.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
