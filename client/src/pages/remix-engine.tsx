import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Repeat,
  Sparkles,
  Zap,
  FileText,
  Layers,
  CheckCircle,
  Film,
  AlertCircle,
} from "lucide-react";

interface RemixResult {
  analysis: string;
  improved_hook: string;
  optimized_script: string;
  structure_suggestion: string;
  blueprint: {
    hook: { text: string; visual_suggestion: string };
    scenes: Array<{ title: string; description: string; visual_suggestion: string; script_lines: string }>;
    cta: { text: string; visual_suggestion: string };
  };
  improvements: string[];
}

export default function RemixEngine() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<string>("script");
  const [result, setResult] = useState<RemixResult | null>(null);

  const remixMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/remix", { content, contentType });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => {
      toast({ title: t.remixEngine.error, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Repeat className="w-6 h-6 text-primary" />
            {t.remixEngine.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t.remixEngine.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.remixEngine.inputLabel}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <Label>{t.remixEngine.contentType}</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger data-testid="select-content-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="script">{t.remixEngine.script}</SelectItem>
                      <SelectItem value="caption">{t.remixEngine.caption}</SelectItem>
                      <SelectItem value="hook">{t.remixEngine.hook}</SelectItem>
                      <SelectItem value="post">{t.remixEngine.post}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t.remixEngine.inputPlaceholder}
                  className="min-h-[200px]"
                  data-testid="textarea-remix-content"
                />
                <Button
                  onClick={() => remixMutation.mutate()}
                  disabled={!content.trim() || remixMutation.isPending}
                  className="gap-2"
                  data-testid="button-remix"
                >
                  <Sparkles className="w-4 h-4" />
                  {remixMutation.isPending ? t.remixEngine.remixing : t.remixEngine.remix}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            {!result && !remixMutation.isPending ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Repeat className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">{t.remixEngine.noContent}</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">{t.remixEngine.noContentHint}</p>
                </CardContent>
              </Card>
            ) : remixMutation.isPending ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse mb-3" />
                  <p className="text-muted-foreground">{t.remixEngine.remixing}</p>
                </CardContent>
              </Card>
            ) : result ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-500" />
                      {t.remixEngine.analysis}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground" data-testid="text-analysis">{result.analysis}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      {t.remixEngine.improvedHook}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium bg-primary/5 p-3 rounded-md border border-primary/20" data-testid="text-improved-hook">
                      {result.improved_hook}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-500" />
                      {t.remixEngine.structureSuggestion}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground" data-testid="text-structure">{result.structure_suggestion}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-500" />
                      {t.remixEngine.optimizedScript}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed" data-testid="text-optimized-script">
                      {result.optimized_script}
                    </p>
                  </CardContent>
                </Card>

                {result.blueprint && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Film className="w-4 h-4 text-orange-500" />
                        {t.remixEngine.blueprint}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="bg-muted/30 p-3 rounded-md">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Hook</p>
                        <p className="text-sm">{result.blueprint.hook?.text}</p>
                        {result.blueprint.hook?.visual_suggestion && (
                          <p className="text-[10px] text-muted-foreground mt-1">🎬 {result.blueprint.hook.visual_suggestion}</p>
                        )}
                      </div>
                      {result.blueprint.scenes?.map((scene, i) => (
                        <div key={i} className="bg-muted/30 p-3 rounded-md">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{scene.title}</p>
                          <p className="text-sm">{scene.description}</p>
                          {scene.visual_suggestion && (
                            <p className="text-[10px] text-muted-foreground mt-1">🎬 {scene.visual_suggestion}</p>
                          )}
                        </div>
                      ))}
                      {result.blueprint.cta && (
                        <div className="bg-muted/30 p-3 rounded-md">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">CTA</p>
                          <p className="text-sm">{result.blueprint.cta.text}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {result.improvements && result.improvements.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        {t.remixEngine.improvements}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {result.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-improvement-${i}`}>
                            <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">{i + 1}</Badge>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
