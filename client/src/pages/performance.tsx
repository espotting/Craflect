import { DashboardLayout } from "@/components/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  Sparkles,
  ArrowRight,
  Plus,
  ExternalLink,
  Loader2,
  BarChart3,
  Target,
} from "lucide-react";

interface TrackedVideo {
  id: string;
  video_url: string;
  hook: string;
  predicted_score: number;
  real_views: number | null;
  real_likes: number | null;
  real_comments: number | null;
  real_shares: number | null;
  published_at: string | null;
  tracked_at: string;
}

function getDelta(predicted: number, real: number | null): string {
  if (real === null) return "—";
  const delta = Math.round(((real - predicted) / predicted) * 100);
  return delta >= 0 ? `+${delta}%` : `${delta}%`;
}

function getDeltaColor(predicted: number, real: number | null): string {
  if (real === null) return "text-slate-400";
  const delta = ((real - predicted) / predicted) * 100;
  if (delta >= 10) return "text-green-400";
  if (delta <= -10) return "text-red-400";
  return "text-slate-300";
}

function formatViews(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

export default function PerformancePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [showInput, setShowInput] = useState(false);

  const { data: tracked, isLoading } = useQuery<TrackedVideo[]>({
    queryKey: ["/api/performance/tracked"],
  });

  const trackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/performance/track", {
        video_url: url.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance/tracked"] });
      setUrl("");
      setShowInput(false);
      toast({ title: "Video added to tracking" });
    },
    onError: () => {
      toast({ title: "Could not track this video", variant: "destructive" });
    },
  });

  const hasVideos = tracked && tracked.length > 0;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto" data-testid="page-performance">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2" data-testid="text-page-title">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              Performance
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Track your published videos — predicted vs real
            </p>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setShowInput(!showInput)}
            data-testid="button-track-video"
          >
            <Plus className="w-4 h-4 mr-2" />
            Track a video
          </Button>
        </div>

        {/* Track input */}
        {showInput && (
          <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700 flex gap-3 items-center">
            <Input
              placeholder="Paste your TikTok or Instagram video URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white flex-1"
              onKeyDown={(e) => e.key === "Enter" && trackMutation.mutate()}
              data-testid="input-video-url"
            />
            <Button
              onClick={() => trackMutation.mutate()}
              disabled={!url.trim() || trackMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
              data-testid="button-confirm-track"
            >
              {trackMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : "Track"
              }
            </Button>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-400 shrink-0"
              onClick={() => { setShowInput(false); setUrl(""); }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasVideos && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">No videos tracked yet</h3>
            <p className="text-slate-400 text-sm max-w-sm mb-6">
              Publish your video, then come back to paste the URL and track how it performs vs Craflect's prediction.
            </p>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => navigate("/create")}
              data-testid="button-open-studio"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Open Studio
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Tracked videos table */}
        {hasVideos && (
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden" data-testid="tracked-videos-table">
            <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-400 uppercase tracking-wider">
              <div className="col-span-2">Video</div>
              <div className="text-center">Predicted</div>
              <div className="text-center">Real Views</div>
              <div className="text-center">Delta</div>
            </div>

            <div className="divide-y divide-slate-800">
              {tracked.map((video) => (
                <div
                  key={video.id}
                  className="grid grid-cols-5 gap-4 px-5 py-4 items-center hover:bg-slate-800/30 transition-colors"
                  data-testid={`tracked-row-${video.id}`}
                >
                  {/* Hook + URL */}
                  <div className="col-span-2">
                    <p className="text-white text-sm font-medium line-clamp-2 mb-1">
                      {video.hook || "Untitled video"}
                    </p>
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-purple-400 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on platform
                    </a>
                  </div>

                  {/* Predicted score */}
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-400">
                      {video.predicted_score}
                    </div>
                    <div className="text-[10px] text-slate-500">score</div>
                  </div>

                  {/* Real views */}
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {formatViews(video.real_views)}
                    </div>
                    <div className="text-[10px] text-slate-500">views</div>
                  </div>

                  {/* Delta */}
                  <div className="text-center">
                    <div className={`text-lg font-bold ${getDeltaColor(video.predicted_score, video.real_views)}`}>
                      {getDelta(video.predicted_score, video.real_views)}
                    </div>
                    <div className="text-[10px] text-slate-500">vs predicted</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accuracy banner — visible quand assez de données */}
        {hasVideos && tracked.filter((v) => v.real_views !== null).length >= 3 && (
          <div className="mt-6 p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/20 flex items-center gap-3">
            <Target className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Craflect prediction accuracy</span> is being calculated based on your tracked videos.
            </p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
