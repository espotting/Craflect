import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Brain,
  Plus,
  ArrowLeft,
  Link2,
  Loader2,
  BarChart3,
  Target,
  TrendingUp,
  Sparkles,
  Video,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

function DistributionBar({ data, label }: { data: Record<string, number> | null; label: string }) {
  if (!data) return null;
  const sorted = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;

  const colors = [
    "bg-primary", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
    "bg-rose-500", "bg-violet-500", "bg-cyan-500", "bg-orange-500",
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="space-y-1.5">
        {sorted.slice(0, 5).map(([key, value], i) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-32 truncate" title={key.replace(/_/g, " ")}>
              {key.replace(/_/g, " ")}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${colors[i % colors.length]} transition-all`}
                style={{ width: `${Math.round(value * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-10 text-right">
              {Math.round(value * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({ value, label }: { value: number | null; label: string }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold font-mono ${color}`}>{pct}%</span>
    </div>
  );
}

function NicheList({ onSelect }: { onSelect: (id: string) => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: niches, isLoading } = useQuery<any[]>({
    queryKey: ["/api/intelligence/niches"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/intelligence/niches", { name, description });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/niches"] });
      toast({ title: t.intelligence.nicheCreated, description: t.intelligence.nicheCreatedDesc.replace("{name}", data.name) });
      setCreateOpen(false);
      setName("");
      setDescription("");
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground" data-testid="text-intelligence-title">
              {t.intelligence.title}
            </h1>
            <p className="text-muted-foreground">{t.intelligence.subtitle}</p>
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-niche">
              <Plus className="w-4 h-4 mr-2" />
              {t.intelligence.createNiche}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.intelligence.createNiche}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{t.intelligence.nicheName}</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t.intelligence.nicheNamePlaceholder}
                  data-testid="input-niche-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{t.intelligence.nicheDescription}</label>
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t.intelligence.nicheDescPlaceholder}
                  data-testid="input-niche-description"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
                className="w-full"
                data-testid="button-submit-niche"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t.intelligence.create}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!niches || niches.length === 0) ? (
        <Card className="glass-card border-border">
          <CardContent className="py-16 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">{t.intelligence.noNiches}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {niches.map((niche: any) => (
            <Card
              key={niche.id}
              className="glass-card border-border cursor-pointer hover-elevate transition-all"
              onClick={() => onSelect(niche.id)}
              data-testid={`card-niche-${niche.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display text-foreground">{niche.name}</CardTitle>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {niche.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{niche.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs rounded-full">
                    <Video className="w-3 h-3 mr-1" />
                    {niche.videoCount || 0} {t.intelligence.videos}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NicheDetail({ nicheId, onBack }: { nicheId: string; onBack: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [ingestUrl, setIngestUrl] = useState("");

  const { data: niche } = useQuery<any>({
    queryKey: ["/api/intelligence/niches", nicheId],
  });

  const { data: patterns } = useQuery<any>({
    queryKey: ["/api/intelligence/niches", nicheId, "patterns"],
  });

  const { data: statistics } = useQuery<any>({
    queryKey: ["/api/intelligence/niches", nicheId, "statistics"],
  });

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/intelligence/niches", nicheId, "profile"],
  });

  const { data: primitives } = useQuery<any[]>({
    queryKey: ["/api/intelligence/niches", nicheId, "primitives"],
  });

  const ingestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/intelligence/niches/${nicheId}/ingest`, { url: ingestUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/niches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/niches", nicheId] });
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/niches", nicheId, "patterns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/niches", nicheId, "statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/niches", nicheId, "primitives"] });
      toast({ title: t.intelligence.videoIngested, description: t.intelligence.videoIngestedDesc });
      setIngestUrl("");
    },
    onError: (err: any) => {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/intelligence/niches/${nicheId}/profile/generate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/niches", nicheId, "profile"] });
      toast({ title: t.intelligence.profileGenerated, description: t.intelligence.profileGeneratedDesc });
    },
    onError: (err: any) => {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-niches">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.intelligence.back}
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-foreground" data-testid="text-niche-name">
            {niche?.name || "..."}
          </h1>
          {niche?.description && <p className="text-muted-foreground text-sm">{niche.description}</p>}
        </div>
      </div>

      <Card className="glass-card border-border">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={ingestUrl}
                onChange={e => setIngestUrl(e.target.value)}
                placeholder={t.intelligence.urlPlaceholder}
                data-testid="input-ingest-url"
              />
            </div>
            <Button
              onClick={() => ingestMutation.mutate()}
              disabled={!ingestUrl.trim() || ingestMutation.isPending}
              data-testid="button-ingest"
            >
              {ingestMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.intelligence.ingesting}</>
              ) : (
                <><Link2 className="w-4 h-4 mr-2" />{t.intelligence.ingest}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="statistics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="statistics" data-testid="tab-statistics">
            <BarChart3 className="w-4 h-4 mr-2" />
            {t.intelligence.statistics}
          </TabsTrigger>
          <TabsTrigger value="patterns" data-testid="tab-patterns">
            <Target className="w-4 h-4 mr-2" />
            {t.intelligence.patterns}
          </TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <TrendingUp className="w-4 h-4 mr-2" />
            {t.intelligence.profile}
          </TabsTrigger>
          <TabsTrigger value="primitives" data-testid="tab-primitives">
            <Video className="w-4 h-4 mr-2" />
            {t.intelligence.primitives}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statistics">
          {statistics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label={t.intelligence.totalVideos} value={statistics.totalVideos} icon={Video} />
              <StatCard label={t.intelligence.dominantHook} value={statistics.dominantHook?.replace(/_/g, " ")} icon={Sparkles} />
              <StatCard label={t.intelligence.dominantStructure} value={statistics.dominantStructure?.replace(/_/g, " ")} icon={Target} />
              <StatCard label={t.intelligence.dominantAngle} value={statistics.dominantAngle?.replace(/_/g, " ")} icon={TrendingUp} />
              <StatCard label={t.intelligence.dominantFormat} value={statistics.dominantFormat?.replace(/_/g, " ")} icon={BarChart3} />
              <StatCard label={t.intelligence.medianDuration} value={statistics.medianDuration ? `${Math.round(statistics.medianDuration)}${t.intelligence.seconds}` : "—"} icon={Video} />
              <Card className="glass-card border-border md:col-span-2 lg:col-span-3">
                <CardContent className="pt-6 flex items-center gap-8 justify-center">
                  <ScoreBadge value={statistics.patternStabilityScore} label={t.intelligence.stability} />
                  <ScoreBadge value={statistics.confidenceScore} label={t.intelligence.confidence} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="glass-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t.intelligence.noStatistics}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns">
          {patterns ? (
            <Card className="glass-card border-border">
              <CardContent className="pt-6 space-y-6">
                <DistributionBar data={patterns.hookDistribution} label={t.intelligence.hookDistribution} />
                <DistributionBar data={patterns.structureDistribution} label={t.intelligence.structureDistribution} />
                <DistributionBar data={patterns.angleDistribution} label={t.intelligence.angleDistribution} />
                <DistributionBar data={patterns.formatDistribution} label={t.intelligence.formatDistribution} />
                {patterns.avgDuration != null && (
                  <div className="flex gap-6 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">{t.intelligence.avgDuration}</p>
                      <p className="text-lg font-bold font-mono text-foreground">{Math.round(patterns.avgDuration)}{t.intelligence.seconds}</p>
                    </div>
                    {patterns.medianDuration != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t.intelligence.medianDuration}</p>
                        <p className="text-lg font-bold font-mono text-foreground">{Math.round(patterns.medianDuration)}{t.intelligence.seconds}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t.intelligence.noPatterns}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card className="glass-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display text-foreground">{t.intelligence.profile}</CardTitle>
                <Button
                  size="sm"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  data-testid="button-generate-profile"
                >
                  {generateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.intelligence.generating}</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />{t.intelligence.generateProfile}</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {profile ? (
                <div className="space-y-6">
                  {profile.intelligenceSummary && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">{t.intelligence.intelligenceSummary}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.intelligenceSummary}</p>
                    </div>
                  )}
                  {profile.strategicRecommendation && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">{t.intelligence.strategicRecommendation}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.strategicRecommendation}</p>
                    </div>
                  )}
                  {profile.nicheShiftSignal && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">{t.intelligence.nicheShift}</h3>
                      <Badge variant="outline" className="rounded-full">{profile.nicheShiftSignal}</Badge>
                    </div>
                  )}
                  <ScoreBadge value={profile.confidenceScore} label={t.intelligence.confidence} />
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t.intelligence.noProfile}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="primitives">
          {primitives && primitives.length > 0 ? (
            <Card className="glass-card border-border">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-3 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>{t.intelligence.hookType}</span>
                    <span>{t.intelligence.structureModel}</span>
                    <span>{t.intelligence.angleCategory}</span>
                    <span>{t.intelligence.formatType}</span>
                    <span>{t.intelligence.platform}</span>
                    <span>{t.intelligence.performanceScore}</span>
                  </div>
                  {primitives.map((p: any) => (
                    <div key={p.id} className="grid grid-cols-6 gap-3 px-3 py-3 rounded-xl bg-muted/50 border border-border items-center" data-testid={`row-primitive-${p.id}`}>
                      <Badge variant="outline" className="text-[10px] rounded-full w-fit">{p.hookType?.replace(/_/g, " ")}</Badge>
                      <span className="text-xs text-muted-foreground truncate">{p.structureModel?.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground truncate">{p.angleCategory?.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="text-[10px] rounded-full w-fit">{p.formatType?.replace(/_/g, " ")}</Badge>
                      <span className="text-xs text-muted-foreground">{p.platform}</span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {p.pacingScore != null ? Math.round(((p.pacingScore + (p.authorityScore || 0) + (p.emotionalIntensityScore || 0)) / 3) * 100) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t.intelligence.noPrimitives}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <Card className="glass-card border-border">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        </div>
        <p className="text-2xl font-bold font-display text-foreground">{value || "—"}</p>
      </CardContent>
    </Card>
  );
}

export default function Intelligence() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedNicheId, setSelectedNicheId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.isAdmin) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  if (!user?.isAdmin) return null;

  return (
    <DashboardLayout>
      {selectedNicheId ? (
        <NicheDetail nicheId={selectedNicheId} onBack={() => setSelectedNicheId(null)} />
      ) : (
        <NicheList onSelect={setSelectedNicheId} />
      )}
    </DashboardLayout>
  );
}
