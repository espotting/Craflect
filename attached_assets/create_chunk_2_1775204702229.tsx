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
