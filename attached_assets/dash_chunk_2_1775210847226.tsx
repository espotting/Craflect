  trending,
  onNavigate,
}: {
  trending: TrendingOpportunity[];
  onNavigate: (path: string) => void;
}) {
  const { toast } = useToast();

  const handleSave = async (opp: TrendingOpportunity) => {
    try {
      await apiRequest("POST", "/api/ideas/save", {
        hook: opp.hook,
        format: opp.format,
        topic: opp.topic,
        opportunityScore: opp.viralityScore,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({ title: "Idea saved" });
    } catch {}
  };

  const videos: VideoCardData[] = trending.slice(0, 4).map((opp) => ({
    id: opp.id,
    hook: opp.hook,
    format: opp.format,
    views: opp.viewRange,
    viralityScore: opp.viralityScore,
    platform: opp.platform,
    thumbnail: opp.thumbnailUrl || undefined,
  }));

  return (
    <section data-testid="section-trending-patterns">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Trending Patterns
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Top performing content right now</p>
        </div>
        <Button
          variant="outline"
          className="border-slate-700 text-slate-300"
          onClick={() => onNavigate("/opportunities")}
          data-testid="button-see-all"
        >
          See All
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {videos.map((video) => {
          const opp = trending.find((o) => o.id === video.id);
          return (
            <VideoCardV2
              key={video.id}
              video={video}
              onCreateSimilar={() => opp && onNavigate(buildStudioUrl(opp))}
              onAnalyze={() => {}}
              onSave={() => opp && handleSave(opp)}
            />
          );
        })}
      </div>
    </section>
  );
}

// ─── Hook Performance ─────────────────────────────────────────────────────────

function HookPerformance({ hooks }: { hooks: TrendingHook[] }) {
  return (
    <section data-testid="section-hook-performance">
      <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-yellow-400" />
        Hook Performance
      </h2>
      <div className="grid grid-cols-5 gap-3">
        {hooks.slice(0, 5).map((hook, i) => (
          <div
            key={i}
            className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 text-center"
            data-testid={`hook-card-${i}`}
          >
            <p className="text-white font-medium text-sm capitalize mb-1">
              {hook.hookType?.replace(/_/g, " ") || "Hook"}
            </p>
            <p className="text-slate-400 text-xs mb-2">{hook.usageCount} uses</p>
            <div className={`text-2xl font-bold ${getViralityColor(hook.avgVirality)}`}>
              {Math.round(hook.avgVirality)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">avg score</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Trending Niches ──────────────────────────────────────────────────────────

function TrendingNiches({
  niches,
  onNavigate,
}: {
  niches: TrendingNiche[];
  onNavigate: (path: string) => void;
}) {
  return (
    <section data-testid="section-trending-niches">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Trending Niches
        </h2>
      </div>
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 divide-y divide-slate-800">
        {niches.slice(0, 6).map((niche, i) => {
          const trend = getTrendBadge(niche.avgVirality);
          return (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors cursor-pointer"
              onClick={() => onNavigate(`/opportunities?niche=${niche.niche}`)}
              data-testid={`niche-row-${i}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-slate-500 w-5 text-sm">{i + 1}</span>
                <span className="text-white font-medium text-sm">{niche.label}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-400 text-sm">{niche.videoCount.toLocaleString()} videos</span>
                <span className="text-slate-400 text-sm">avg {Math.round(niche.avgVirality)}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${trend.color}`}>
                  {trend.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── CTA Studio ───────────────────────────────────────────────────────────────

function StudioCTA({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section
      className="bg-gradient-to-r from-purple-900/30 to-fuchsia-900/30 rounded-2xl p-8 border border-purple-500/20"
      data-testid="section-cta-studio"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to create your next viral video?
          </h2>
          <p className="text-slate-400">
            Turn these insights into content — hook, script, blueprint in 4 steps.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-14 text-lg font-semibold rounded-xl shrink-0"
          onClick={() => onNavigate("/create")}
          data-testid="button-open-studio"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Open Studio
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </section>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-72 w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const { data: viralPlay, isLoading: loadingPlay } = useQuery<ViralPlay | null>({
    queryKey: ["/api/home/viral-play"],
  });
  const { data: trending, isLoading: loadingTrending } = useQuery<TrendingOpportunity[]>({
    queryKey: ["/api/home/trending-opportunities"],
  });
  const { data: hooks } = useQuery<TrendingHook[]>({
    queryKey: ["/api/home/trending-hooks"],
  });
  const { data: niches } = useQuery<TrendingNiche[]>({
    queryKey: ["/api/home/trending-niches"],
  });
  const { data: credits } = useQuery<CreditsInfo>({
    queryKey: ["/api/credits"],
  });

  const isLoading = loadingPlay || loadingTrending;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-16" data-testid="page-dashboard">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-page-title">
              Intelligence
            </h1>
            <p className="text-slate-400 text-sm">
              {trending?.length
                ? `${trending.length} patterns analyzed · updated today`
                : "Your content intelligence feed"}
            </p>
          </div>
          {credits && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800" data-testid="credits-counter">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">{credits.credits}</span>
              <span className="text-xs text-slate-400">/ {credits.maxCredits}</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-8">

            {/* 1 — Viral Play of the Day */}
            {viralPlay && (
              <ViralPlayCard viralPlay={viralPlay} onNavigate={navigate} />
            )}

            {/* 2 — Pipeline stats */}
            <PipelineStats niches={niches} trending={trending} />

            {/* 3 — Trending patterns */}
            {trending && trending.length > 0 && (
              <TrendingPatterns trending={trending} onNavigate={navigate} />
            )}

            {/* 4 — Hook performance */}
            {hooks && hooks.length > 0 && (
              <HookPerformance hooks={hooks} />
            )}

            {/* 5 — Trending niches */}
            {niches && niches.length > 0 && (
              <TrendingNiches niches={niches} onNavigate={navigate} />
            )}

            {/* 6 — CTA Studio */}
            <StudioCTA onNavigate={navigate} />

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
