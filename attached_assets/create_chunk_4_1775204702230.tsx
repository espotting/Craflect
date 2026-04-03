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
