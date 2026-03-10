import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout";
import { CreditCard, Zap, ArrowRight, Download, ExternalLink, Plus, Trash2, Star, Loader2, Coins, BarChart3, Video, Sparkles, User, Layers, Crown } from "lucide-react";
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

interface CreditsInfo {
  credits: number;
  maxCredits: number;
  plan: string;
  costs: Record<string, number>;
  estimatedVideos: number;
}

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

const NEW_PLANS = [
  {
    key: "free" as const,
    price: 0,
    yearlyPrice: 0,
    credits: 30,
    features: ["30 AI credits/month", "Basic viral intelligence", "Script generation", "Preview only (no export)"],
    color: "from-slate-500 to-slate-600",
  },
  {
    key: "creator" as const,
    price: 24,
    yearlyPrice: 19,
    credits: 250,
    popular: true,
    features: ["250 AI credits/month", "Full viral intelligence", "Script + Blueprint generation", "Export scripts & blueprints", "Viral templates"],
    color: "from-purple-500 to-fuchsia-500",
  },
  {
    key: "pro" as const,
    price: 109,
    yearlyPrice: 99,
    credits: 1500,
    features: ["1,500 AI credits/month", "Advanced viral intelligence", "AI Avatar videos", "Priority generation", "Video Remix (coming soon)", "API access"],
    color: "from-orange-500 to-amber-500",
  },
];

const CREDIT_COSTS = [
  { action: "idea", cost: 1, icon: Sparkles },
  { action: "script", cost: 1, icon: Video },
  { action: "blueprint", cost: 1, icon: Layers },
  { action: "template_render", cost: 2, icon: BarChart3 },
  { action: "avatar", cost: 3, icon: User },
];

function CardBrandIcon({ brand }: { brand: string }) {
  switch (brand) {
    case "visa":
      return <SiVisa className="w-8 h-5 text-blue-600" />;
    case "mastercard":
      return <SiMastercard className="w-8 h-5 text-orange-500" />;
    default:
      return <CreditCard className="w-5 h-5 text-slate-400" />;
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
      const { error } = await stripe.confirmCardSetup(clientSecret, { payment_method: { card: cardElement } });
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
      <div className="border border-slate-700 rounded-lg p-4 bg-slate-800">
        <CardElement options={{ style: { base: { fontSize: "16px", color: "#fff", "::placeholder": { color: "#94a3b8" } } } }} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="border-slate-700 text-slate-300" data-testid="button-cancel-add-card">{t.common.cancel}</Button>
        <Button type="submit" disabled={isSubmitting || !stripe} className="bg-purple-600 hover:bg-purple-700" data-testid="button-confirm-add-card">
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

  const { data: methods, isLoading } = useQuery<PaymentMethod[]>({ queryKey: ["/api/billing/payment-methods"] });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => { const res = await apiRequest("DELETE", `/api/billing/payment-methods/${id}`); return res.json(); },
    onSuccess: () => { toast({ title: t.billing.cardRemoved, description: t.billing.cardRemovedDesc }); queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] }); setRemoveDialogId(null); },
    onError: (err: any) => { toast({ title: t.billing.removeCardError, description: err.message, variant: "destructive" }); },
  });

  const defaultMutation = useMutation({
    mutationFn: async (id: string) => { const res = await apiRequest("POST", `/api/billing/payment-methods/${id}/default`); return res.json(); },
    onSuccess: () => { toast({ title: t.billing.cardDefaultSet, description: t.billing.cardDefaultSetDesc }); queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] }); },
  });

  const handleCardAdded = () => { setShowAddCard(false); queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] }); };

  return (
    <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800" data-testid="card-payment-methods">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-400" />
          {t.billing.paymentMethods}
        </h3>
        {!showAddCard && (
          <Button variant="outline" size="sm" onClick={() => setShowAddCard(true)} className="border-slate-700 text-slate-300" data-testid="button-add-card">
            <Plus className="w-4 h-4 mr-1" /> {t.billing.addCard}
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : (
        <>
          {(!methods || methods.length === 0) && !showAddCard && (
            <p className="text-sm text-slate-400" data-testid="text-no-payment-methods">{t.billing.noPaymentMethods}</p>
          )}
          {methods && methods.length > 0 && (
            <div className="space-y-3">
              {methods.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between p-3 border border-slate-700 rounded-lg bg-slate-800/50" data-testid={`card-pm-${pm.id}`}>
                  <div className="flex items-center gap-3">
                    <CardBrandIcon brand={pm.brand} />
                    <div>
                      <p className="text-sm font-medium text-white" data-testid={`text-pm-last4-${pm.id}`}>•••• {pm.last4}</p>
                      <p className="text-xs text-slate-400" data-testid={`text-pm-exp-${pm.id}`}>
                        {t.billing.expiresOn.replace("{month}", String(pm.expMonth).padStart(2, "0")).replace("{year}", String(pm.expYear))}
                      </p>
                    </div>
                    {pm.isDefault && <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30" data-testid={`badge-default-${pm.id}`}>{t.billing.defaultBadge}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!pm.isDefault && (
                      <Button variant="ghost" size="sm" onClick={() => defaultMutation.mutate(pm.id)} disabled={defaultMutation.isPending} className="text-slate-400" data-testid={`button-set-default-${pm.id}`}>
                        <Star className="w-3.5 h-3.5 mr-1" /> {t.billing.setDefault}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setRemoveDialogId(pm.id)} data-testid={`button-remove-pm-${pm.id}`}>
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

      <Dialog open={!!removeDialogId} onOpenChange={() => setRemoveDialogId(null)}>
        <DialogContent data-testid="dialog-remove-card">
          <DialogHeader>
            <DialogTitle>{t.billing.confirmRemoveTitle}</DialogTitle>
            <DialogDescription>{t.billing.confirmRemoveDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveDialogId(null)} data-testid="button-cancel-remove">{t.common.cancel}</Button>
            <Button variant="destructive" onClick={() => removeDialogId && removeMutation.mutate(removeDialogId)} disabled={removeMutation.isPending} data-testid="button-confirm-remove">
              {removeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {t.billing.confirmRemoveBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PlanBilling() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: subscription, isLoading } = useSubscription();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const { data: stripeConfig } = useQuery<{ publishableKey: string }>({ queryKey: ["/api/billing/config"] });
  const { data: credits, isLoading: creditsLoading } = useQuery<CreditsInfo>({ queryKey: ["/api/credits"] });
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({ queryKey: ["/api/billing/invoices"] });

  useEffect(() => {
    if (stripeConfig?.publishableKey && !stripePromise) {
      setStripePromise(loadStripe(stripeConfig.publishableKey));
    }
  }, [stripeConfig?.publishableKey]);

  const checkoutMutation = useMutation({
    mutationFn: async (plan: string) => { const res = await apiRequest("POST", "/api/billing/checkout", { plan }); return res.json(); },
    onSuccess: (data: { url: string }) => { window.location.href = data.url; },
  });

  const portalMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/billing/portal"); return res.json(); },
    onSuccess: (data: { url: string }) => { window.location.href = data.url; },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({ title: t.billing.successTitle, description: t.billing.successDesc });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("canceled") === "true") {
      toast({ title: t.billing.canceledTitle, description: t.billing.canceledDesc, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const currentPlan = credits?.plan ?? "free";
  const creditsUsed = credits ? credits.maxCredits - credits.credits : 0;
  const creditsPercent = credits ? (credits.credits / credits.maxCredits) * 100 : 0;

  const renewalDate = subscription?.renewalDate ? new Date(subscription.renewalDate) : null;
  function getDaysUntil(date: Date | null): number {
    if (!date) return 0;
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  function formatAmount(cents: number | null | undefined): string {
    if (cents == null) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8" data-testid="page-billing">
        <div>
          <h1 className="text-2xl font-bold text-white" data-testid="text-billing-title">
            {t.billing.title}
          </h1>
          <p className="text-slate-400 text-sm" data-testid="text-billing-subtitle">
            {t.billing.subtitle}
          </p>
        </div>

        {isLoading || creditsLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800" data-testid="card-current-plan">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-sm">{t.billing.currentPlan}</span>
                  <Badge className={`capitalize ${currentPlan === "pro" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : currentPlan === "creator" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-slate-700 text-slate-300 border-slate-600"}`} data-testid="badge-current-plan">
                    {currentPlan === "free" ? "Free" : currentPlan === "creator" ? "Creator" : "Pro"}
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-white capitalize mb-1" data-testid="text-plan-name">
                  {currentPlan === "free" ? "Free" : currentPlan === "creator" ? "Creator" : "Pro"}
                </p>
                {subscription?.stripeCustomerId && (
                  <Button variant="outline" size="sm" className="mt-3 border-slate-700 text-slate-300" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending} data-testid="button-manage-subscription">
                    <ExternalLink className="w-4 h-4 mr-2" /> {t.billing.managePlan}
                  </Button>
                )}
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800" data-testid="card-credits">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-sm">{t.billing.aiCredits || "AI Credits"}</span>
                  <Coins className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-bold text-white" data-testid="text-credits-remaining">{credits?.credits ?? 0}</span>
                  <span className="text-slate-400 text-sm mb-1">/ {credits?.maxCredits ?? 30}</span>
                </div>
                <Progress value={creditsPercent} className="h-2 mb-2" data-testid="progress-credits" />
                <p className="text-xs text-slate-400" data-testid="text-estimated-videos">
                  ≈ {credits?.estimatedVideos ?? 0} {t.billing.estimatedVideos || "videos remaining"}
                </p>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800" data-testid="card-usage-stats">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-400 text-sm">{t.billing.usageStats || "Usage Stats"}</span>
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{t.billing.creditsUsed || "Credits Used"}</span>
                    <span className="text-sm font-medium text-white" data-testid="text-credits-used">{creditsUsed}</span>
                  </div>
                  {renewalDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">{t.billing.renewsLabel || "Renews"}</span>
                      <span className="text-sm font-medium text-white">{getDaysUntil(renewalDate)} {t.billing.daysLeft || "days"}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{t.billing.costPerVideo || "Cost/Video"}</span>
                    <span className="text-sm font-medium text-white">≈ 3 credits</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                {t.billing.creditCosts || "Credit Costs"}
              </h3>
              <div className="grid grid-cols-5 gap-4">
                {CREDIT_COSTS.map((item) => (
                  <div key={item.action} className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700" data-testid={`cost-${item.action}`}>
                    <item.icon className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-white font-medium text-sm capitalize mb-1">{item.action.replace(/_/g, " ")}</p>
                    <p className="text-2xl font-bold text-yellow-400">{item.cost}</p>
                    <p className="text-xs text-slate-400">credit{item.cost > 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white" data-testid="text-plans-title">
                  {t.billing.choosePlan || "Choose Your Plan"}
                </h2>
                <div className="flex items-center gap-2 px-2 py-1 bg-slate-900 rounded-lg border border-slate-800" data-testid="billing-cycle-toggle">
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${billingCycle === "monthly" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                    data-testid="button-monthly"
                  >
                    {t.billing.monthlyLabel || "Monthly"}
                  </button>
                  <button
                    onClick={() => setBillingCycle("yearly")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${billingCycle === "yearly" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                    data-testid="button-yearly"
                  >
                    {t.billing.yearlyLabel || "Yearly"}
                    <span className="ml-1 text-green-400 text-xs">{t.billing.yearlySave || "Save 20%"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {NEW_PLANS.map((plan) => {
                  const isCurrentPlan = currentPlan === plan.key;
                  const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.price;
                  return (
                    <div
                      key={plan.key}
                      className={`relative bg-slate-900/50 rounded-2xl p-6 border transition-all ${
                        isCurrentPlan ? "border-purple-500/50 ring-1 ring-purple-500/20" :
                        plan.popular ? "border-purple-500/30" : "border-slate-800"
                      }`}
                      data-testid={`card-plan-${plan.key}`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
                          {t.billing.popular || "Most Popular"}
                        </span>
                      )}
                      {isCurrentPlan && (
                        <Badge className="absolute top-4 right-4 bg-purple-500/20 text-purple-300 border-purple-500/30" data-testid={`badge-current-${plan.key}`}>
                          {t.billing.currentPlan}
                        </Badge>
                      )}

                      <h3 className="text-white font-semibold text-lg capitalize mb-1">{plan.key === "free" ? "Free" : plan.key === "creator" ? "Creator" : "Pro"}</h3>
                      <div className="flex items-end gap-1 mb-1">
                        <span className="text-3xl font-bold text-white" data-testid={`text-price-${plan.key}`}>${price}</span>
                        {plan.price > 0 && <span className="text-slate-400 text-sm mb-1">{t.billing.perMonth}</span>}
                      </div>
                      <p className="text-sm text-purple-400 font-medium mb-4">{plan.credits} {t.billing.creditsMonth || "credits/month"}</p>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {!isCurrentPlan && plan.key !== "free" && (
                        <Button
                          className={`w-full ${plan.popular ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"}`}
                          onClick={() => checkoutMutation.mutate(plan.key)}
                          disabled={checkoutMutation.isPending}
                          data-testid={`button-subscribe-${plan.key}`}
                        >
                          {currentPlan === "free" ? (t.billing.subscribeNow || "Subscribe") : (t.billing.switchPlan || "Switch Plan")}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      {isCurrentPlan && plan.key !== "free" && (
                        <Button variant="outline" className="w-full border-purple-500/30 text-purple-300" disabled data-testid={`button-current-${plan.key}`}>
                          <Crown className="w-4 h-4 mr-2" /> {t.billing.currentPlan}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <PaymentMethodsSection stripePromise={stripePromise} />

            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800" data-testid="card-invoices">
              <h3 className="text-white font-semibold mb-4">{t.billing.invoices}</h3>
              {invoicesLoading ? (
                <div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>
              ) : !invoices || invoices.length === 0 ? (
                <p className="text-sm text-slate-400" data-testid="text-no-invoices">{t.billing.noInvoices}</p>
              ) : (
                <Table data-testid="table-invoices">
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-400">{t.billing.invoiceDate}</TableHead>
                      <TableHead className="text-slate-400">{t.billing.invoiceAmountHT}</TableHead>
                      <TableHead className="text-slate-400">{t.billing.invoiceTax}</TableHead>
                      <TableHead className="text-slate-400">{t.billing.invoiceTotal}</TableHead>
                      <TableHead className="text-slate-400">{t.billing.invoiceStatus}</TableHead>
                      <TableHead className="text-slate-400">{t.billing.invoiceDownload}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="border-slate-700" data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="text-white" data-testid={`text-invoice-date-${invoice.id}`}>{new Date(invoice.date * 1000).toLocaleDateString()}</TableCell>
                        <TableCell className="text-white" data-testid={`text-invoice-amount-${invoice.id}`}>{formatAmount(invoice.amount_excluding_tax)}</TableCell>
                        <TableCell className="text-white" data-testid={`text-invoice-tax-${invoice.id}`}>{formatAmount(invoice.tax)}</TableCell>
                        <TableCell className="text-white" data-testid={`text-invoice-total-${invoice.id}`}>{formatAmount(invoice.total)}</TableCell>
                        <TableCell data-testid={`text-invoice-status-${invoice.id}`}>
                          <Badge className={invoice.status === "paid" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-slate-700 text-slate-300 border-slate-600"}>{invoice.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.invoice_pdf && (
                            <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" data-testid={`link-invoice-pdf-${invoice.id}`}>
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white"><Download className="w-4 h-4" /></Button>
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
