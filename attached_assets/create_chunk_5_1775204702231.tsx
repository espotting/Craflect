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
