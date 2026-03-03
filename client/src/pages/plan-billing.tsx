import { DashboardLayout } from "@/components/layout";
import { CreditCard, Zap, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { useSubscription } from "@/hooks/use-subscription";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlanBilling() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { data: subscription, isLoading } = useSubscription();

  const analysesUsed = subscription?.analysesUsed ?? 0;
  const analysesLimit = subscription?.analysesLimit ?? 20;
  const nichesCount = subscription?.nichesCount ?? 0;
  const nichesLimit = subscription?.nichesLimit ?? 1;
  const analysesPercent = analysesLimit > 0 ? (analysesUsed / analysesLimit) * 100 : 0;
  const nichesPercent = nichesLimit > 0 ? (nichesCount / nichesLimit) * 100 : 0;
  const isCloseToLimit = analysesPercent >= 80;

  const trialEndDate = subscription?.trialEndDate ? new Date(subscription.trialEndDate) : null;
  const renewalDate = subscription?.renewalDate ? new Date(subscription.renewalDate) : null;
  const isTrial = subscription?.billingStatus === "trial";

  function getDaysUntil(date: Date | null): number {
    if (!date) return 0;
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const daysRemaining = isTrial ? getDaysUntil(trialEndDate) : getDaysUntil(renewalDate);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground" data-testid="text-billing-title">
            {t.billing.title}
          </h1>
          <p className="text-muted-foreground text-sm" data-testid="text-billing-subtitle">
            {t.billing.subtitle}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <Card data-testid="card-current-plan">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {t.billing.currentPlan}
                </CardTitle>
                {isTrial && (
                  <Badge variant="secondary" data-testid="badge-trial">
                    {t.billing.freeTrial}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-bold text-foreground capitalize" data-testid="text-plan-name">
                  {subscription?.plan ?? "Starter"}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-renews-in">
                  {t.billing.renewsIn.replace("{days}", String(daysRemaining))}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card data-testid="card-analyses-usage">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{t.billing.analyses}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground" data-testid="text-analyses-used">
                      {analysesUsed} / {analysesLimit}
                    </span>
                    <span className="text-muted-foreground font-mono">{Math.round(analysesPercent)}%</span>
                  </div>
                  <Progress value={analysesPercent} className="h-2" data-testid="progress-analyses" />
                </CardContent>
              </Card>

              <Card data-testid="card-niches-usage">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{t.billing.niches}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground" data-testid="text-niches-used">
                      {nichesCount} / {nichesLimit}
                    </span>
                    <span className="text-muted-foreground font-mono">{Math.round(nichesPercent)}%</span>
                  </div>
                  <Progress value={nichesPercent} className="h-2" data-testid="progress-niches" />
                </CardContent>
              </Card>
            </div>

            {isCloseToLimit && (
              <Card className="border-yellow-500/30 bg-yellow-500/5" data-testid="card-upgrade-warning">
                <CardContent className="pt-6 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground" data-testid="text-upgrade-warning">
                      {t.billing.upgradeWarning}
                    </p>
                    <Button
                      variant="default"
                      onClick={() => setLocation("/pricing")}
                      data-testid="button-upgrade-plan"
                    >
                      {t.billing.upgradePlan}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-analyses-memory">
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground" data-testid="text-analyses-memory">
                  {t.billing.analysesMemory}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/pricing")}
                    data-testid="button-view-pricing"
                  >
                    {t.billing.viewPricing}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
