import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout";
import { CreditCard, Zap, ArrowRight, Download, ExternalLink, Plus, Trash2, Star, Loader2 } from "lucide-react";
import { SiVisa, SiMastercard } from "react-icons/si";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const PLANS = [
  { key: "starter" as const, price: 29, analyses: 20, niches: 1 },
  { key: "pro" as const, price: 69, analyses: 100, niches: 3 },
  { key: "studio" as const, price: 199, analyses: 300, niches: -1 },
];

interface Invoice {
  id: string;
  date: number;
  amount_excluding_tax: number | null;
  tax: number | null;
  total: number;
  status: string;
  invoice_pdf: string | null;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

function CardBrandIcon({ brand }: { brand: string }) {
  switch (brand) {
    case "visa":
      return <SiVisa className="w-8 h-5 text-blue-600" />;
    case "mastercard":
      return <SiMastercard className="w-8 h-5 text-orange-500" />;
    default:
      return <CreditCard className="w-5 h-5 text-muted-foreground" />;
  }
}

function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/billing/setup-intent");
      const { clientSecret } = await res.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      const { error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        toast({ title: t.billing.addCardError, description: error.message, variant: "destructive" });
      } else {
        toast({ title: t.billing.cardAdded, description: t.billing.cardAddedDesc });
        onSuccess();
      }
    } catch (err: any) {
      toast({ title: t.billing.addCardError, description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4 bg-background">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "hsl(var(--foreground))",
                "::placeholder": { color: "hsl(var(--muted-foreground))" },
              },
            },
          }}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-add-card">
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={isSubmitting || !stripe} data-testid="button-confirm-add-card">
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          {t.billing.addCard}
        </Button>
      </div>
    </form>
  );
}

function PaymentMethodsSection({ stripePromise }: { stripePromise: Promise<Stripe | null> | null }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showAddCard, setShowAddCard] = useState(false);
  const [removeDialogId, setRemoveDialogId] = useState<string | null>(null);

  const { data: methods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/billing/payment-methods"],
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/billing/payment-methods/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.billing.cardRemoved, description: t.billing.cardRemovedDesc });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] });
      setRemoveDialogId(null);
    },
    onError: (err: any) => {
      toast({ title: t.billing.removeCardError, description: err.message, variant: "destructive" });
    },
  });

  const defaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/billing/payment-methods/${id}/default`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.billing.cardDefaultSet, description: t.billing.cardDefaultSetDesc });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] });
    },
  });

  const handleCardAdded = () => {
    setShowAddCard(false);
    queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] });
  };

  return (
    <Card data-testid="card-payment-methods">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          {t.billing.paymentMethods}
        </CardTitle>
        {!showAddCard && (
          <Button variant="outline" size="sm" onClick={() => setShowAddCard(true)} data-testid="button-add-card">
            <Plus className="w-4 h-4 mr-1" />
            {t.billing.addCard}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            {(!methods || methods.length === 0) && !showAddCard && (
              <p className="text-sm text-muted-foreground" data-testid="text-no-payment-methods">
                {t.billing.noPaymentMethods}
              </p>
            )}

            {methods && methods.length > 0 && (
              <div className="space-y-3">
                {methods.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    data-testid={`card-pm-${pm.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <CardBrandIcon brand={pm.brand} />
                      <div>
                        <p className="text-sm font-medium text-foreground" data-testid={`text-pm-last4-${pm.id}`}>
                          •••• {pm.last4}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-pm-exp-${pm.id}`}>
                          {t.billing.expiresOn.replace("{month}", String(pm.expMonth).padStart(2, "0")).replace("{year}", String(pm.expYear))}
                        </p>
                      </div>
                      {pm.isDefault && (
                        <Badge variant="default" className="text-[10px]" data-testid={`badge-default-${pm.id}`}>
                          {t.billing.defaultBadge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!pm.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => defaultMutation.mutate(pm.id)}
                          disabled={defaultMutation.isPending}
                          data-testid={`button-set-default-${pm.id}`}
                        >
                          <Star className="w-3.5 h-3.5 mr-1" />
                          {t.billing.setDefault}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoveDialogId(pm.id)}
                        data-testid={`button-remove-pm-${pm.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddCard && stripePromise && (
              <Elements stripe={stripePromise}>
                <AddCardForm onSuccess={handleCardAdded} onCancel={() => setShowAddCard(false)} />
              </Elements>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={!!removeDialogId} onOpenChange={() => setRemoveDialogId(null)}>
        <DialogContent data-testid="dialog-remove-card">
          <DialogHeader>
            <DialogTitle>{t.billing.confirmRemoveTitle}</DialogTitle>
            <DialogDescription>{t.billing.confirmRemoveDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveDialogId(null)} data-testid="button-cancel-remove">
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeDialogId && removeMutation.mutate(removeDialogId)}
              disabled={removeMutation.isPending}
              data-testid="button-confirm-remove"
            >
              {removeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {t.billing.confirmRemoveBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function PlanBilling() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: subscription, isLoading } = useSubscription();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  const { data: stripeConfig } = useQuery<{ publishableKey: string }>({
    queryKey: ["/api/billing/config"],
  });

  useEffect(() => {
    if (stripeConfig?.publishableKey && !stripePromise) {
      setStripePromise(loadStripe(stripeConfig.publishableKey));
    }
  }, [stripeConfig?.publishableKey]);

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/billing/invoices"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/billing/checkout", { plan });
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/portal");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: t.billing.successTitle,
        description: t.billing.successDesc,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("canceled") === "true") {
      toast({
        title: t.billing.canceledTitle,
        description: t.billing.canceledDesc,
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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

  function getStatusBadge(status: string | undefined) {
    switch (status) {
      case "active":
        return <Badge variant="default" data-testid="badge-status-active">{t.billing.active}</Badge>;
      case "past_due":
        return <Badge variant="destructive" data-testid="badge-status-past-due">{t.billing.pastDue}</Badge>;
      case "canceled":
        return <Badge variant="secondary" data-testid="badge-status-canceled">{t.billing.canceled}</Badge>;
      case "trial":
        return <Badge variant="outline" data-testid="badge-status-trial">{t.billing.trialing}</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-status-unknown">{t.billing.freeTrial}</Badge>;
    }
  }

  function formatAmount(cents: number | null | undefined): string {
    if (cents == null) return "€0.00";
    return `€${(cents / 100).toFixed(2)}`;
  }

  const currentPlan = subscription?.plan ?? "starter";

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
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
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
                {getStatusBadge(subscription?.billingStatus)}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-bold text-foreground capitalize" data-testid="text-plan-name">
                  {subscription?.plan ?? "Starter"}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-renews-in">
                  {t.billing.renewsIn.replace("{days}", String(daysRemaining))}
                </p>
                {subscription?.stripeCustomerId && (
                  <Button
                    variant="outline"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid="button-manage-subscription"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t.billing.managePlan}
                  </Button>
                )}
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
                      onClick={() => checkoutMutation.mutate("pro")}
                      disabled={checkoutMutation.isPending}
                      data-testid="button-upgrade-plan"
                    >
                      {t.billing.upgradePlan}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4" data-testid="text-plans-title">
                {t.pricing.comparison.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLANS.map((plan) => {
                  const isCurrentPlan = currentPlan === plan.key;
                  const planLabel = t.billing[plan.key as keyof typeof t.billing] as string;
                  return (
                    <Card
                      key={plan.key}
                      className={isCurrentPlan ? "border-primary" : ""}
                      data-testid={`card-plan-${plan.key}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="text-lg font-semibold">{planLabel}</CardTitle>
                          {isCurrentPlan && (
                            <Badge variant="default" data-testid={`badge-current-${plan.key}`}>
                              {t.billing.currentPlan}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-3xl font-bold text-foreground" data-testid={`text-price-${plan.key}`}>
                          €{plan.price}<span className="text-sm font-normal text-muted-foreground">{t.billing.perMonth}</span>
                        </p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li data-testid={`text-analyses-${plan.key}`}>
                            {plan.analyses} {t.pricing.features.analyses}
                          </li>
                          <li data-testid={`text-niches-${plan.key}`}>
                            {plan.niches === -1
                              ? t.pricing.features.unlimitedNiches
                              : `${plan.niches} ${plan.niches === 1 ? t.pricing.features.niche : t.pricing.features.niches}`}
                          </li>
                        </ul>
                        {!isCurrentPlan && (
                          <Button
                            className="w-full"
                            onClick={() => checkoutMutation.mutate(plan.key)}
                            disabled={checkoutMutation.isPending}
                            data-testid={`button-subscribe-${plan.key}`}
                          >
                            {t.billing.subscribeNow}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <PaymentMethodsSection stripePromise={stripePromise} />

            <Card data-testid="card-invoices">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">{t.billing.invoices}</CardTitle>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : !invoices || invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-invoices">
                    {t.billing.noInvoices}
                  </p>
                ) : (
                  <Table data-testid="table-invoices">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.billing.invoiceDate}</TableHead>
                        <TableHead>{t.billing.invoiceAmountHT}</TableHead>
                        <TableHead>{t.billing.invoiceTax}</TableHead>
                        <TableHead>{t.billing.invoiceTotal}</TableHead>
                        <TableHead>{t.billing.invoiceStatus}</TableHead>
                        <TableHead>{t.billing.invoiceDownload}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                          <TableCell data-testid={`text-invoice-date-${invoice.id}`}>
                            {new Date(invoice.date * 1000).toLocaleDateString()}
                          </TableCell>
                          <TableCell data-testid={`text-invoice-amount-${invoice.id}`}>
                            {formatAmount(invoice.amount_excluding_tax)}
                          </TableCell>
                          <TableCell data-testid={`text-invoice-tax-${invoice.id}`}>
                            {formatAmount(invoice.tax)}
                          </TableCell>
                          <TableCell data-testid={`text-invoice-total-${invoice.id}`}>
                            {formatAmount(invoice.total)}
                          </TableCell>
                          <TableCell data-testid={`text-invoice-status-${invoice.id}`}>
                            <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {invoice.invoice_pdf && (
                              <a
                                href={invoice.invoice_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`link-invoice-pdf-${invoice.id}`}
                              >
                                <Button variant="ghost" size="icon">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
