import { DashboardLayout } from "@/components/layout";
import { ContentScorecard } from "@/components/content-scorecard";
import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Sparkles,
  RefreshCw,
  Save,
  Video,
  Loader2,
  Pencil,
  Info,
} from "lucide-react";

interface GeneratedScript {
  hook: string;
  hook_variations?: string[];
  structure: string;
  script: string;
  cta: string;
}

export default function ScriptGenerator() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const searchString = useSearch();
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(searchString);
  const prefillHook = params.get("hook") || "";
  const prefillFormat = params.get("format") || "";
  const prefillTopic = params.get("topic") || "";
  const hasPrefill = !!(prefillHook || prefillFormat || prefillTopic);

  const [hook, setHook] = useState(prefillHook);
  const [format, setFormat] = useState(prefillFormat);
  const [topic, setTopic] = useState(prefillTopic);
  const [context, setContext] = useState("");

  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);

  const [editHook, setEditHook] = useState("");
  const [editStructure, setEditStructure] = useState("");
  const [editScript, setEditScript] = useState("");
  const [editCta, setEditCta] = useState("");

  useEffect(() => {
    if (generatedScript) {
      setEditHook(generatedScript.hook);
      setEditStructure(generatedScript.structure);
      setEditScript(generatedScript.script);
      setEditCta(generatedScript.cta);
    }
  }, [generatedScript]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate/script", {
        hook,
        format: format || undefined,
        topic: topic || undefined,
        context: context || undefined,
      });
      return res.json() as Promise<GeneratedScript>;
    },
    onSuccess: (data) => {
      setGeneratedScript(data);
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: t.scriptGenerator.generateError,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const scriptData = {
        hook: editHook,
        structure: editStructure,
        script: editScript,
        cta: editCta,
      };
      const res = await apiRequest("POST", "/api/projects", {
        title: editHook.substring(0, 80) || hook.substring(0, 80) || "Untitled Script",
        hook: editHook || hook,
        format: format || undefined,
        topic: topic || undefined,
        script: scriptData,
        status: "draft",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: t.common.success,
        description: t.scriptGenerator.savedSuccess,
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: t.scriptGenerator.savedError,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!hook.trim()) {
      toast({
        title: t.common.error,
        description: t.scriptGenerator.hookRequired,
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const handleCreateVideo = () => {
    const videoParams = new URLSearchParams();
    if (hook) videoParams.set("hook", hook);
    if (format) videoParams.set("format", format);
    if (topic) videoParams.set("topic", topic);
    if (editScript) videoParams.set("script", editScript);
    setLocation(`/video-builder?${videoParams.toString()}`);
  };

  const hasGenerated = !!generatedScript;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto" data-testid="page-script-generator">
        <div className="flex flex-row items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-script-generator-title">
              {t.scriptGenerator.title}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-script-generator-description">
              {t.scriptGenerator.description}
            </p>
          </div>
        </div>

        {hasPrefill && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>{t.scriptGenerator.prefilled}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 flex flex-col gap-4" data-testid="card-script-input">
            <div className="flex items-center gap-2 mb-1">
              <Pencil className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">{t.scriptGenerator.inputSection}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hook-input">{t.scriptGenerator.hookLabel} *</Label>
              <Input
                id="hook-input"
                data-testid="input-hook"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder={t.scriptGenerator.hookPlaceholder}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="format-input">{t.scriptGenerator.formatLabel}</Label>
              <Input
                id="format-input"
                data-testid="input-format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder={t.scriptGenerator.formatPlaceholder}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topic-input">{t.scriptGenerator.topicLabel}</Label>
              <Input
                id="topic-input"
                data-testid="input-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.scriptGenerator.topicPlaceholder}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="context-input">{t.scriptGenerator.contextLabel}</Label>
              <Textarea
                id="context-input"
                data-testid="input-context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t.scriptGenerator.contextPlaceholder}
                className="resize-none min-h-[80px]"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="gap-2 mt-2"
              data-testid="button-generate-script"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.scriptGenerator.generating}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t.scriptGenerator.generateScript}
                </>
              )}
            </Button>
          </Card>

          <Card className="p-5 flex flex-col gap-4" data-testid="card-script-output">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{t.scriptGenerator.outputSection}</span>
              </div>
              {hasGenerated && (
                <Badge variant="secondary" className="text-xs">{t.scriptGenerator.editHint}</Badge>
              )}
            </div>

            {generateMutation.isPending ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : hasGenerated ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-hook">{t.scriptGenerator.generatedHook}</Label>
                  <Textarea
                    id="edit-hook"
                    data-testid="textarea-edit-hook"
                    value={editHook}
                    onChange={(e) => setEditHook(e.target.value)}
                    className="resize-none min-h-[60px]"
                  />
                </div>

                {generatedScript?.hook_variations && generatedScript.hook_variations.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <Label>{t.scriptGenerator.hookVariations}</Label>
                    <div className="space-y-2">
                      {generatedScript.hook_variations.map((variation, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2.5 rounded-md border border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors"
                          onClick={() => setEditHook(variation)}
                          data-testid={`hook-variation-${i}`}
                        >
                          <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">
                            {String.fromCharCode(65 + i)}
                          </Badge>
                          <p className="text-sm text-foreground leading-snug">{variation}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{t.scriptGenerator.clickToUse}</p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-structure">{t.scriptGenerator.generatedStructure}</Label>
                  <Textarea
                    id="edit-structure"
                    data-testid="textarea-edit-structure"
                    value={editStructure}
                    onChange={(e) => setEditStructure(e.target.value)}
                    className="resize-none min-h-[60px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-script">{t.scriptGenerator.generatedScript}</Label>
                  <Textarea
                    id="edit-script"
                    data-testid="textarea-edit-script"
                    value={editScript}
                    onChange={(e) => setEditScript(e.target.value)}
                    className="resize-none min-h-[160px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-cta">{t.scriptGenerator.generatedCta}</Label>
                  <Textarea
                    id="edit-cta"
                    data-testid="textarea-edit-cta"
                    value={editCta}
                    onChange={(e) => setEditCta(e.target.value)}
                    className="resize-none min-h-[60px]"
                  />
                </div>

                <div className="flex flex-row items-center gap-2 flex-wrap pt-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    className="gap-2"
                    data-testid="button-regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t.scriptGenerator.regenerate}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="gap-2"
                    data-testid="button-save-project"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t.scriptGenerator.saving}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {t.scriptGenerator.saveToProject}
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleCreateVideo}
                    className="gap-2"
                    data-testid="button-create-video"
                  >
                    <Video className="w-4 h-4" />
                    {t.scriptGenerator.createVideo}
                  </Button>
                </div>

                <ContentScorecard
                  hook={editHook || hook}
                  format={format}
                  topic={topic}
                  script={editScript}
                  cta={editCta}
                  visible={!!generatedScript}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">{t.scriptGenerator.description}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
