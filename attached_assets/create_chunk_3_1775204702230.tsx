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
