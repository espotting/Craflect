import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Eye,
  ArrowRight,
  TrendingUp,
  Zap,
  Target,
  Image,
  Lightbulb,
  Flame,
  BookmarkPlus,
  Coins,
  Crown,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function getViralityColor(score: number) {
  if (score >= 80) return "text-violet-500";
  if (score >= 60) return "text-orange-500";
  return "text-yellow-500";
}

function getViralityBg(score: number) {
  if (score >= 80) return "bg-violet-500/10 border-violet-500/20";
  if (score >= 60) return "bg-orange-500/10 border-orange-500/20";
  return "bg-yellow-500/10 border-yellow-500/20";
}

function getViralityBadge(score: number) {
  if (score >= 80) return "bg-violet-500/20 text-violet-400 border-violet-500/30";
  if (score >= 60) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
}

interface ViralPlay {
  hook: string;
  format: string;
  topic: string;
  platform: string | null;
  viralityScore: number;
  viewRange: string;
  confidence: number;
  videoCount: number;
  whyItWorks: string;
  trendClassification: string | null;
}

interface TrendingOpportunity {
  id: string;
  hook: string;
  format: string;
  topic: string;
  platform: string;
  viralityScore: number;
  viewRange: string;
  views: number | null;
  thumbnailUrl: string | null;
}

interface TrendingHook {
  hook: string;
  hookType: string | null;
  topic: string | null;
  avgVirality: number;
  usageCount: number;
}

interface TrendingNiche {
  niche: string;
  label: string;
  videoCount: number;
  avgVirality: number;
  topScore: number;
}

interface CreditsInfo {
  credits: number;
  maxCredits: number;
  plan: string;
  costs: Record<string, number>;
}

function CreditsCounter({ credits }: { credits: CreditsInfo | undefined }) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  if (!credits) return null;

  const percentage = (credits.credits / credits.maxCredits) * 100;

  return (
    <Card className="border border-border/50" data-testid="credits-counter">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-medium">{t.dashboard.aiCredits}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" data-testid="text-credits-count">{credits.credits}</span>
            <span className="text-xs text-muted-foreground">/ {credits.maxCredits}</span>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        {credits.plan === "free" && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-xs text-violet-500 hover:text-violet-400"
            onClick={() => setLocation("/billing")}
            data-testid="link-upgrade-credits"
          >
            <Crown className="h-3 w-3 mr-1" />
            {t.dashboard.upgradeForMore}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ViralPlaySection({ data, credits }: { data: ViralPlay | null; credits: CreditsInfo | undefined }) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  if (!data) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-8 text-center">
          <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold text-lg">{t.dashboard.noDataTitle}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t.dashboard.noDataDesc}</p>
        </CardContent>
      </Card>
    );
  }

  const topicLabel = data.topic.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const formatLabel = data.format.replace(/_/g, " ");

  return (
    <Card className={`border ${getViralityBg(data.viralityScore)} relative overflow-hidden`} data-testid="card-viral-play">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-bl-full" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-500" />
            <CardTitle className="text-lg">{t.dashboard.viralPlayOfTheDay}</CardTitle>
          </div>
          {data.trendClassification === "rising" && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <TrendingUp className="h-3 w-3 mr-1" /> Rising
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t.dashboard.viralPlayDesc}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-background/60 border border-border/30">
          <p className="text-base font-medium leading-snug" data-testid="text-viral-play-hook">"{data.hook}"</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="text-xs">{formatLabel}</Badge>
            <Badge variant="outline" className="text-xs">{topicLabel}</Badge>
            {data.platform && <Badge variant="outline" className="text-xs">{data.platform}</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-background/40">
            <div className={`text-xl font-bold ${getViralityColor(data.viralityScore)}`} data-testid="text-viral-play-score">
              {data.viralityScore}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.viralityScore}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/40">
            <div className="text-sm font-semibold" data-testid="text-viral-play-views">{data.viewRange}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.predictedViews}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/40">
            <div className="text-sm font-semibold">{data.confidence}%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.dashboard.confidence}</div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-500 mb-1">{t.dashboard.whyItWorks}</p>
              <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-why-it-works">{data.whyItWorks}</p>
            </div>
          </div>
        </div>

        <Button
          className="w-full bg-violet-600 hover:bg-violet-700"
          onClick={() => setLocation(`/create?hook=${encodeURIComponent(data.hook)}&format=${encodeURIComponent(data.format)}&topic=${encodeURIComponent(data.topic)}`)}
          data-testid="button-create-viral-play"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {t.dashboard.createThisVideo}
        </Button>
      </CardContent>
    </Card>
  );
}

function TrendingOpportunitiesSection({ data }: { data: TrendingOpportunity[] | undefined }) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleSave = async (opp: TrendingOpportunity) => {
    try {
      await apiRequest("POST", "/api/ideas/save", {
        hook: opp.hook,
        format: opp.format,
        topic: opp.topic,
        opportunityScore: opp.viralityScore,
      });
      setSavedIds((prev) => new Set(prev).add(opp.id));
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      toast({ title: t.dashboard.savedIdea });
    } catch {}
  };

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-4" data-testid="section-trending-opportunities">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          {t.dashboard.trendingOpportunities}
        </h2>
        <p className="text-sm text-muted-foreground">{t.dashboard.trendingOpportunitiesDesc}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((opp) => (
          <Card key={opp.id} className="border border-border/50 hover:border-border transition-colors" data-testid={`card-opportunity-${opp.id}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Badge className={`text-[10px] ${getViralityBadge(opp.viralityScore)}`}>
                  {opp.viralityScore}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{opp.platform}</Badge>
              </div>
              <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem]" data-testid={`text-hook-${opp.id}`}>"{opp.hook}"</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{opp.format.replace(/_/g, " ")}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{opp.topic.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {opp.viewRange}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-violet-600 hover:bg-violet-700"
                  onClick={() => setLocation(`/create?hook=${encodeURIComponent(opp.hook)}&format=${encodeURIComponent(opp.format)}&topic=${encodeURIComponent(opp.topic)}`)}
                  data-testid={`button-create-${opp.id}`}
                >
                  {t.dashboard.createVideo}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => handleSave(opp)}
                  disabled={savedIds.has(opp.id)}
                  data-testid={`button-save-${opp.id}`}
                >
                  <BookmarkPlus className="h-3 w-3 mr-1" />
                  {savedIds.has(opp.id) ? t.dashboard.saved : t.dashboard.save}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateNextVideoSection() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const cards = [
    {
      icon: Target,
      title: t.dashboard.fromViralOpportunity,
      desc: t.dashboard.fromViralOpportunityDesc,
      action: () => setLocation("/opportunities"),
      color: "text-violet-500",
      testId: "card-from-opportunity",
    },
    {
      icon: Image,
      title: t.dashboard.fromImage,
      desc: t.dashboard.fromImageDesc,
      action: null,
      color: "text-blue-500",
      comingSoon: true,
      testId: "card-from-image",
    },
    {
      icon: Lightbulb,
      title: t.dashboard.fromIdea,
      desc: t.dashboard.fromIdeaDesc,
      action: () => setLocation("/create"),
      color: "text-amber-500",
      testId: "card-from-idea",
    },
  ];

  return (
    <div className="space-y-4" data-testid="section-create-next">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-violet-500" />
        {t.dashboard.createYourNextVideo}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card
            key={card.testId}
            className={`border border-border/50 cursor-pointer hover:border-border transition-colors ${card.comingSoon ? "opacity-60" : ""}`}
            onClick={card.action || undefined}
            data-testid={card.testId}
          >
            <CardContent className="p-5 text-center space-y-3">
              <div className={`inline-flex p-3 rounded-xl bg-muted/50 ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-sm">{card.title}</h3>
              <p className="text-xs text-muted-foreground">{card.desc}</p>
              {card.comingSoon && (
                <Badge variant="outline" className="text-[10px]">{t.dashboard.comingSoon}</Badge>
              )}
              {!card.comingSoon && (
                <Button variant="ghost" size="sm" className="text-xs text-violet-500">
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TrendingHooksSection({ data }: { data: TrendingHook[] | undefined }) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-4" data-testid="section-trending-hooks">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          {t.dashboard.trendingHooks}
        </h2>
        <p className="text-sm text-muted-foreground">{t.dashboard.trendingHooksDesc}</p>
      </div>
      <div className="space-y-2">
        {data.slice(0, 8).map((hook, i) => (
          <Card
            key={i}
            className="border border-border/50 cursor-pointer hover:border-border transition-colors"
            onClick={() => setLocation(`/create?hook=${encodeURIComponent(hook.hook || "")}`)}
            data-testid={`card-hook-${i}`}
          >
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                <p className="text-sm truncate flex-1">{hook.hook}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {hook.hookType && (
                  <Badge variant="outline" className="text-[10px]">{hook.hookType.replace(/_/g, " ")}</Badge>
                )}
                <span className={`text-sm font-bold ${getViralityColor(hook.avgVirality)}`}>
                  {Math.round(hook.avgVirality)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TrendingNichesSection({ data }: { data: TrendingNiche[] | undefined }) {
  const { t } = useLanguage();

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-4" data-testid="section-trending-niches">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          {t.dashboard.trendingNiches}
        </h2>
        <p className="text-sm text-muted-foreground">{t.dashboard.trendingNichesDesc}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map((niche, i) => (
          <Card key={i} className="border border-border/50" data-testid={`card-niche-${i}`}>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm">{niche.label}</h3>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{niche.videoCount} {t.dashboard.videos}</span>
                <span>{t.dashboard.avgScore}: <span className={`font-bold ${getViralityColor(niche.avgVirality)}`}>{Math.round(niche.avgVirality)}</span></span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.dashboard.topScore}: <span className={`font-bold ${getViralityColor(niche.topScore)}`}>{niche.topScore}</span></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();

  const { data: viralPlay, isLoading: loadingPlay } = useQuery<ViralPlay | null>({
    queryKey: ["/api/home/viral-play"],
  });

  const { data: trending, isLoading: loadingTrending } = useQuery<TrendingOpportunity[]>({
    queryKey: ["/api/home/trending-opportunities"],
  });

  const { data: hooks, isLoading: loadingHooks } = useQuery<TrendingHook[]>({
    queryKey: ["/api/home/trending-hooks"],
  });

  const { data: niches, isLoading: loadingNiches } = useQuery<TrendingNiche[]>({
    queryKey: ["/api/home/trending-niches"],
  });

  const { data: credits } = useQuery<CreditsInfo>({
    queryKey: ["/api/credits"],
  });

  const isLoading = loadingPlay || loadingTrending;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8" data-testid="page-dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.dashboard.title}</h1>
            <p className="text-sm text-muted-foreground">{t.dashboard.subtitle}</p>
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ViralPlaySection data={viralPlay ?? null} credits={credits} />
              </div>
              <div className="space-y-4">
                <CreditsCounter credits={credits} />
                <CreateNextVideoSection />
              </div>
            </div>

            <TrendingOpportunitiesSection data={trending} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrendingHooksSection data={hooks} />
              <TrendingNichesSection data={niches} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
