import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useSelectedNiche } from "@/hooks/use-selected-niche";
import { useSources, useIngestUrls, useAnalyzeSource } from "@/hooks/use-sources";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Plus, Video, FileText, Link2, Loader2, Upload, Search, Eye, Heart, MessageCircle, BarChart3, Tag, Filter, ArrowUpDown, Globe, Zap, ScanSearch, Check, ChevronsUpDown } from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { ContentSource } from "@shared/schema";

function PlatformIcon({ platform, className }: { platform: string | null; className?: string }) {
  const cls = className || "w-4 h-4";
  switch (platform) {
    case "tiktok":
      return <SiTiktok className={cls} />;
    case "instagram":
      return <SiInstagram className={cls} />;
    case "youtube":
      return <SiYoutube className={cls} />;
    case "twitter":
      return <Globe className={cls} />;
    default:
      return <Link2 className={cls} />;
  }
}

function IngestionStatusBadge({ status }: { status: string | null }) {
  const { t } = useLanguage();
  const config: Record<string, { className: string; label: string }> = {
    pending: { className: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5", label: t.common.pending },
    processing: { className: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/5", label: t.common.processing },
    analyzed: { className: "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/5", label: t.common.analyzed },
    failed: { className: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5", label: t.common.failed },
  };
  const s = status || "pending";
  const c = config[s] || config.pending;
  return (
    <Badge variant="outline" className={`rounded-full text-[10px] uppercase font-bold ${c.className}`} data-testid={`badge-ingestion-${s}`}>
      {c.label}
    </Badge>
  );
}

function PerformanceScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  let colorClass = "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5";
  if (score >= 70) colorClass = "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/5";
  else if (score >= 40) colorClass = "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5";
  return (
    <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${colorClass}`} data-testid={`badge-score-${score}`}>
      <BarChart3 className="w-3 h-3 mr-1" />
      {score}/100
    </Badge>
  );
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function SourceCardSkeleton() {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-4" />
        <div className="flex gap-4 mb-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function detectPlatformFromUrl(url: string): string | null {
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/instagram\.com|instagr\.am/i.test(url)) return "instagram";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  return null;
}

function IngestDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string }) {
  const [urlText, setUrlText] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();
  const ingestUrls = useIngestUrls(workspaceId);

  const parsedUrls = useMemo(() => {
    return urlText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [urlText]);

  const detectedPlatforms = useMemo(() => {
    return parsedUrls.map((url) => detectPlatformFromUrl(url));
  }, [parsedUrls]);

  const validUrls = parsedUrls.filter((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });

  const resetForm = () => {
    setUrlText("");
  };

  const handleSubmit = () => {
    if (validUrls.length === 0) {
      toast({ title: t.library.toasts.urlsRequired, description: t.library.toasts.urlsRequiredDesc, variant: "destructive" });
      return;
    }

    ingestUrls.mutate(
      { urls: validUrls },
      {
        onSuccess: (data) => {
          toast({ title: t.library.toasts.contentAdded, description: t.library.toasts.contentAddedDesc.replace("{count}", String(data.length)).replace("{plural}", data.length !== 1 ? "s" : "") });
          resetForm();
          onOpenChange(false);
        },
        onError: (err) => {
          toast({ title: t.common.error, description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-ingest-urls">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t.library.dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.library.dialogLabel}</Label>
            <Textarea
              placeholder={"https://www.tiktok.com/@creator/video/123\nhttps://www.instagram.com/reel/abc\nhttps://youtube.com/shorts/xyz"}
              className="min-h-[140px] resize-none font-mono text-sm"
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              data-testid="input-urls"
            />
          </div>

          {parsedUrls.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t.library.validUrls.replace("{count}", String(validUrls.length)).replace("{plural}", validUrls.length !== 1 ? "s" : "")}</p>
              <div className="flex flex-wrap gap-1">
                {detectedPlatforms.map((platform, i) => (
                  <Badge key={i} variant="outline" className="rounded-full text-[10px] gap-1">
                    <PlatformIcon platform={platform} className="w-3 h-3" />
                    {platform || "web"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-ingest">
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={ingestUrls.isPending || validUrls.length === 0} data-testid="button-submit-urls">
            {ingestUrls.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {validUrls.length > 0 ? t.library.addCount.replace("{count}", String(validUrls.length)).replace("{plural}", validUrls.length !== 1 ? "s" : "") : t.library.addUrls}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SourceCard({ source, onAnalyze, isAnalyzing, t }: {
  source: ContentSource;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const hasMetrics = source.views !== null || source.likes !== null || source.commentsCount !== null;
  const hasTags = source.hookType || source.contentFormat || source.contentAngle;
  const isAnalyzed = source.ingestionStatus === "analyzed";

  return (
    <Card className="border-border" data-testid={`card-source-${source.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0">
            <PlatformIcon platform={source.platform} className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-foreground truncate" data-testid={`text-source-title-${source.id}`}>
              {source.title}
            </p>
            {source.creatorHandle && (
              <p className="text-xs text-muted-foreground" data-testid={`text-creator-${source.id}`}>
                @{source.creatorHandle}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <IngestionStatusBadge status={source.ingestionStatus} />
          <PerformanceScoreBadge score={source.performanceScore} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {source.description && (
          <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-description-${source.id}`}>
            {source.description}
          </p>
        )}

        {isAnalyzed && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground" data-testid={`metrics-${source.id}`}>
            {hasMetrics ? (
              <>
                {source.views !== null && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(source.views)}
                  </span>
                )}
                {source.likes !== null && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {formatNumber(source.likes)}
                  </span>
                )}
                {source.commentsCount !== null && (
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {formatNumber(source.commentsCount)}
                  </span>
                )}
                {source.duration !== null && (
                  <span className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    {source.duration}s
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground/60 italic" data-testid={`text-metrics-unavailable-${source.id}`}>
                {t.common.metricsUnavailable}
              </span>
            )}
          </div>
        )}

        {hasTags && (
          <div className="flex flex-wrap gap-1" data-testid={`tags-${source.id}`}>
            {source.hookType && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                <Zap className="w-2.5 h-2.5 mr-1" />
                {source.hookType}
              </Badge>
            )}
            {source.contentFormat && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                <Video className="w-2.5 h-2.5 mr-1" />
                {source.contentFormat}
              </Badge>
            )}
            {source.contentAngle && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                <Tag className="w-2.5 h-2.5 mr-1" />
                {source.contentAngle}
              </Badge>
            )}
            {source.nicheCategory && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {source.nicheCategory}
              </Badge>
            )}
          </div>
        )}

        {!isAnalyzed && (
          <Button
            variant="default"
            size="sm"
            className="w-full rounded-lg text-xs"
            onClick={onAnalyze}
            disabled={isAnalyzing || source.ingestionStatus === "processing"}
            data-testid={`button-analyze-${source.id}`}
          >
            {isAnalyzing || source.ingestionStatus === "processing" ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <ScanSearch className="w-3.5 h-3.5 mr-2" />
            )}
            {t.library.analyze}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Library() {
  const [ingestOpen, setIngestOpen] = useState(false);
  const [analyzingSourceId, setAnalyzingSourceId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [hookFilter, setHookFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const { selectedNicheId, setSelectedNicheId } = useSelectedNiche();
  const [nicheOpen, setNicheOpen] = useState(false);
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { data: availableNiches } = useQuery<any[]>({ queryKey: ["/api/niches/available"] });

  const activeNicheId = selectedNicheId || workspaces?.[0]?.nicheId || availableNiches?.[0]?.id;
  const selectedWorkspace = workspaces?.find((w: any) => w.nicheId === activeNicheId) || workspaces?.[0];
  const selectedNiche = availableNiches?.find((n: any) => n.id === activeNicheId);

  const { data: sources, isLoading: sourcesLoading } = useSources(selectedWorkspace?.id, activeNicheId);
  const analyzeMutation = useAnalyzeSource(selectedWorkspace?.id);
  const { toast } = useToast();
  const { t } = useLanguage();

  const isLoading = workspacesLoading || sourcesLoading;

  const platforms = useMemo(() => {
    if (!sources) return [];
    const set = new Set(sources.map((s) => s.platform).filter(Boolean));
    return Array.from(set) as string[];
  }, [sources]);

  const hookTypes = useMemo(() => {
    if (!sources) return [];
    const set = new Set(sources.map((s) => s.hookType).filter(Boolean));
    return Array.from(set) as string[];
  }, [sources]);

  const filteredSources = useMemo(() => {
    if (!sources) return [];
    let filtered = [...sources];

    if (platformFilter !== "all") {
      filtered = filtered.filter((s) => s.platform === platformFilter);
    }
    if (hookFilter !== "all") {
      filtered = filtered.filter((s) => s.hookType === hookFilter);
    }

    switch (sortBy) {
      case "score_desc":
        filtered.sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0));
        break;
      case "score_asc":
        filtered.sort((a, b) => (a.performanceScore ?? 0) - (b.performanceScore ?? 0));
        break;
      case "views":
        filtered.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        break;
      case "recent":
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return filtered;
  }, [sources, platformFilter, hookFilter, sortBy]);

  const handleAnalyze = (source: ContentSource) => {
    if (!selectedWorkspace) return;
    setAnalyzingSourceId(source.id);
    analyzeMutation.mutate(
      { sourceId: source.id },
      {
        onSuccess: () => {
          toast({ title: t.library.toasts.analysisComplete, description: t.library.toasts.analysisCompleteDesc.replace("{title}", source.title || "") });
          setAnalyzingSourceId(null);
        },
        onError: (err) => {
          toast({ title: t.library.toasts.analysisFailed, description: err.message, variant: "destructive" });
          setAnalyzingSourceId(null);
        },
      }
    );
  };

  if (!workspacesLoading && !selectedWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-20 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-no-workspace">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <ScanSearch className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground mb-2">{t.library.noWorkspaceTitle}</h3>
          <p className="text-muted-foreground max-w-md mb-8">{t.library.noWorkspaceDesc}</p>
        </div>
      </DashboardLayout>
    );
  }

  const analyzedCount = sources?.filter((s) => s.ingestionStatus === "analyzed").length ?? 0;
  const totalCount = sources?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-2" data-testid="text-library-title">{t.library.title}</h1>
            <p className="text-muted-foreground" data-testid="text-library-subtitle">
              {totalCount > 0
                ? t.library.subtitle.replace("{analyzed}", String(analyzedCount)).replace("{total}", String(totalCount)).replace("{plural}", totalCount !== 1 ? "s" : "")
                : t.library.emptySubtitle}
            </p>
          </div>
          <Button onClick={() => setIngestOpen(true)} data-testid="button-add-urls">
            <Plus className="w-5 h-5 mr-2" />
            {t.library.addUrls}
          </Button>
        </div>

        {availableNiches && availableNiches.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-primary">{t.dashboard.selectNiche}:</span>
            <Popover open={nicheOpen} onOpenChange={setNicheOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={nicheOpen}
                  className="min-w-[280px] justify-between border-primary/30 hover:border-primary hover:bg-primary/5 transition-colors"
                  data-testid="combobox-library-niche-trigger"
                >
                  <span className="truncate">
                    {selectedNiche
                      ? selectedNiche.name.replace(/_/g, " ")
                      : t.dashboard.selectNiche}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <Command>
                  <CommandInput placeholder={t.dashboard.searchNiche} data-testid="input-library-niche-search" />
                  <CommandList>
                    <CommandEmpty>{t.dashboard.noNicheFound}</CommandEmpty>
                    <CommandGroup>
                      {availableNiches.map((n: any) => (
                        <CommandItem
                          key={n.id}
                          value={n.name}
                          onSelect={() => {
                            setSelectedNicheId(n.id);
                            setNicheOpen(false);
                          }}
                          data-testid={`combobox-library-niche-item-${n.id}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              n.id === activeNicheId ? "opacity-100 text-primary" : "opacity-0"
                            )}
                          />
                          {n.name.replace(/_/g, " ")}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {totalCount > 0 && (
          <div className="flex items-center flex-wrap gap-3" data-testid="filters-bar">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-platform-filter">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.library.allPlatforms}</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={hookFilter} onValueChange={setHookFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-hook-filter">
                  <SelectValue placeholder="Hook Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.library.allHooks}</SelectItem>
                  {hookTypes.map((h) => (
                    <SelectItem key={h} value={h}>{h.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">{t.library.mostRecent}</SelectItem>
                  <SelectItem value="score_desc">{t.library.scoreHighLow}</SelectItem>
                  <SelectItem value="score_asc">{t.library.scoreLowHigh}</SelectItem>
                  <SelectItem value="views">{t.library.mostViews}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SourceCardSkeleton />
            <SourceCardSkeleton />
            <SourceCardSkeleton />
          </div>
        ) : filteredSources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                onAnalyze={() => handleAnalyze(source)}
                isAnalyzing={analyzingSourceId === source.id}
                t={t}
              />
            ))}
          </div>
        ) : totalCount > 0 ? (
          <div className="flex flex-col items-center justify-center p-16 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-filtered">
            <Search className="w-10 h-10 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-bold text-foreground mb-2">{t.library.noMatchTitle}</h3>
            <p className="text-muted-foreground text-sm">{t.library.noMatchDesc}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 rounded-md border-dashed border-2 border-border text-center" data-testid="empty-no-sources">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <ScanSearch className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">{t.library.noContentTitle}</h3>
            <p className="text-muted-foreground max-w-md mb-8">{t.library.noContentNicheDesc || t.library.noContentDesc}</p>
            <Button onClick={() => setIngestOpen(true)} data-testid="button-add-urls-empty">
              <Plus className="w-5 h-5 mr-2" />
              {t.library.addFirstUrls}
            </Button>
          </div>
        )}
      </div>

      {selectedWorkspace && (
        <IngestDialog
          open={ingestOpen}
          onOpenChange={setIngestOpen}
          workspaceId={selectedWorkspace.id}
        />
      )}
    </DashboardLayout>
  );
}
