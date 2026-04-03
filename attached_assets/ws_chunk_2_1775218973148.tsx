                {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                {t.common.save}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}><CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" /><Skeleton className="h-8 w-24" />
        </CardContent></Card>
      ))}
    </div>
  );
}

function GeneratedIdeasTab() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: projects, isLoading } = useQuery<ContentProject[]>({ queryKey: ["/api/projects"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/projects/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); toast({ title: t.projects.deleteSuccess }); },
    onError: () => { toast({ title: t.projects.deleteError, variant: "destructive" }); },
  });

  if (isLoading) return <LoadingSkeleton />;

  const ideas = (projects || []).filter((p) => {
    const script = p.script as Record<string, unknown> | null;
    return !script || Object.keys(script).length === 0;
  });

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Lightbulb className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium mb-1" data-testid="text-no-generated-ideas">{t.workspace.noGeneratedIdeas}</p>
        <p className="text-sm text-muted-foreground mb-4">{t.workspace.noGeneratedIdeasHint}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-generated-ideas">
      {ideas.map((project) => (
        <IdeaCard
          key={project.projectId}
          hook={project.hook} format={project.format}
          score={(project as any).opportunity_score ?? null}
          date={project.createdAt}
          testIdPrefix={`card-generated-idea-${project.projectId}`}
          actions={
            <>
              <Button variant="outline" size="sm" className="flex-1 text-xs"
                onClick={() => setLocation(buildStudioUrl({ hook: project.hook, format: project.format, topic: project.topic, opportunityScore: (project as any).opportunity_score }))}
                data-testid={`button-continue-idea-${project.projectId}`}
              >
                <ArrowRight className="w-3 h-3 mr-1" />Continue in Studio
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(project.projectId)} disabled={deleteMutation.isPending} data-testid={`button-delete-idea-${project.projectId}`}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </>
          }
        />
      ))}
    </div>
  );
}

function CreatedScriptsTab() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedProject, setSelectedProject] = useState<ContentProject | null>(null);

  const { data: projects, isLoading } = useQuery<ContentProject[]>({ queryKey: ["/api/projects"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/projects/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); toast({ title: t.projects.deleteSuccess }); },
    onError: () => { toast({ title: t.projects.deleteError, variant: "destructive" }); },
  });

  if (isLoading) return <LoadingSkeleton />;

  const scripts = (projects || []).filter((p) => {
    const script = p.script as Record<string, unknown> | null;
    return script && Object.keys(script).length > 0;
  });

  if (scripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium mb-1" data-testid="text-no-created-scripts">{t.workspace.noCreatedScripts}</p>
        <p className="text-sm text-muted-foreground mb-4">{t.workspace.noCreatedScriptsHint}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-created-scripts">
        {scripts.map((project) => {
          const hasBlueprint = !!(project.blueprint && Object.keys(project.blueprint as object).length > 0);
          return (
            <Card key={project.projectId} className="hover-elevate transition-all" data-testid={`card-script-${project.projectId}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate text-sm" data-testid={`text-script-title-${project.projectId}`}>
                      {project.title || project.hook || t.projects.untitled}
                    </h3>
                    {project.hook && (
                      <p className="text-sm text-muted-foreground italic line-clamp-2 mt-1" data-testid={`text-script-hook-${project.projectId}`}>
                        "{project.hook}"
                      </p>
                    )}
                  </div>
                  <ViralityScoreBadge score={(project as any).opportunity_score ?? null} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {project.format && <Badge variant="outline" className="text-xs">{project.format.replace(/_/g, " ")}</Badge>}
                  <Badge variant="secondary" className="text-xs"><FileText className="w-3 h-3 mr-0.5" />{t.projects.scriptReady}</Badge>
                  {hasBlueprint && <Badge variant="secondary" className="text-xs"><Video className="w-3 h-3 mr-0.5" />{t.projects.blueprintReady}</Badge>}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border/50 flex-wrap">
                  <span className="text-xs text-muted-foreground">{new Date(project.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedProject(project)} data-testid={`button-open-script-${project.projectId}`}>
                      {t.projects.open}<ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => setLocation(buildStudioUrl({ hook: project.hook, format: project.format, topic: project.topic, opportunityScore: (project as any).opportunity_score }))}
                      data-testid={`button-continue-script-${project.projectId}`}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />Studio
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(project.projectId)} disabled={deleteMutation.isPending} data-testid={`button-delete-script-${project.projectId}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {selectedProject && <ProjectDetail project={selectedProject} open={!!selectedProject} onClose={() => setSelectedProject(null)} />}
    </>
  );
}

function SavedInspirationsTab() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: savedIdeas, isLoading } = useQuery<SavedIdea[]>({ queryKey: ["/api/ideas"] });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("POST", "/api/ideas/dismiss", { id }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ideas"] }); toast({ title: t.workspace.ideaDismissed }); },
    onError: () => { toast({ title: t.common.error, variant: "destructive" }); },
  });

  if (isLoading) return <LoadingSkeleton />;

  const activeIdeas = (savedIdeas || []).filter((i) => i.status === "saved");

  if (activeIdeas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Bookmark className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium mb-1" data-testid="text-no-inspirations">{t.workspace.noInspirations}</p>
        <p className="text-sm text-muted-foreground mb-4" data-testid="text-no-inspirations-hint">{t.workspace.noInspirationsHint}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-saved-inspirations">
      {activeIdeas.map((idea) => (
        <IdeaCard
          key={idea.id}
          hook={idea.hook} format={idea.format}
          score={idea.opportunityScore}
          date={idea.createdAt}
          testIdPrefix={`card-inspiration-${idea.id}`}
          actions={
            <>
              <Button variant="outline" size="sm" className="flex-1 text-xs"
                onClick={() => setLocation(buildStudioUrl({ hook: idea.hook, format: idea.format, topic: idea.topic, opportunityScore: idea.opportunityScore }))}
                data-testid={`button-create-from-inspiration-${idea.id}`}
              >
                <ArrowRight className="w-3 h-3 mr-1" />Continue in Studio
              </Button>
              <Button variant="ghost" size="icon" onClick={() => dismissMutation.mutate(idea.id)} disabled={dismissMutation.isPending} data-testid={`button-delete-inspiration-${idea.id}`}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </>
          }
        />
      ))}
    </div>
  );
}

export default function WorkspacePage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("generated-ideas");

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto" data-testid="page-workspace">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-workspace-title">{t.workspace.title}</h1>
          </div>
          <p className="text-muted-foreground text-sm" data-testid="text-workspace-subtitle">{t.workspace.subtitle}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-workspace">
            <TabsTrigger value="generated-ideas" data-testid="tab-generated-ideas">
              <Lightbulb className="w-4 h-4 mr-1.5" />{t.workspace.tabGeneratedIdeas}
            </TabsTrigger>
            <TabsTrigger value="created-scripts" data-testid="tab-created-scripts">
              <FileText className="w-4 h-4 mr-1.5" />{t.workspace.tabCreatedScripts}
            </TabsTrigger>
            <TabsTrigger value="saved-inspirations" data-testid="tab-saved-inspirations">
              <Bookmark className="w-4 h-4 mr-1.5" />{t.workspace.tabSavedInspirations}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="generated-ideas" className="mt-4"><GeneratedIdeasTab /></TabsContent>
          <TabsContent value="created-scripts" className="mt-4"><CreatedScriptsTab /></TabsContent>
          <TabsContent value="saved-inspirations" className="mt-4"><SavedInspirationsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
