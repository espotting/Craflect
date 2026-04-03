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
