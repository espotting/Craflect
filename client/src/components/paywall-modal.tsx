import { Lock, Sparkles, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
}

export function PaywallModal({ isOpen, onClose, currentPlan }: PaywallModalProps) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const plans = [
    {
      name: "Creator",
      price: 24,
      yearlyPrice: 19,
      credits: 250,
      popular: true,
      features: [
        t.studio?.paywall?.featureExport || "Export videos",
        t.studio?.paywall?.featureCredits || "250 AI credits/month",
        t.studio?.paywall?.featureRollover || "Credit rollover (2 months)",
      ],
    },
    {
      name: "Pro",
      price: 109,
      yearlyPrice: 99,
      credits: 1500,
      popular: false,
      features: [
        t.studio?.paywall?.featureExport || "Export videos",
        t.studio?.paywall?.featureProCredits || "1,500 AI credits/month",
        t.studio?.paywall?.featureAllModes || "All creation modes",
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl" data-testid="paywall-modal">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-white">
            {t.studio?.paywall?.title || "Upgrade to Export Your Video"}
          </DialogTitle>
        </DialogHeader>

        <div className="text-center mb-6">
          <p className="text-slate-400">
            {t.studio?.paywall?.description || "You're on the"}{" "}
            <span className="text-white font-medium capitalize">{currentPlan}</span>{" "}
            {t.studio?.paywall?.descriptionSuffix || "plan. Upgrade to unlock video export and more features."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-slate-800/50 rounded-xl p-4 border ${plan.popular ? "border-purple-500/50" : "border-slate-700"}`}
              data-testid={`paywall-plan-${plan.name.toLowerCase()}`}
            >
              {plan.popular && (
                <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full mb-2">
                  Popular
                </span>
              )}
              <h4 className="text-white font-semibold mb-1">{plan.name}</h4>
              <p className="text-2xl font-bold text-white mb-1">
                ${plan.price}<span className="text-sm text-slate-400">/mo</span>
              </p>
              <p className="text-slate-400 text-sm mb-3">{plan.credits} credits</p>

              <ul className="space-y-1 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  onClose();
                  navigate("/plan-billing");
                }}
                data-testid={`button-upgrade-${plan.name.toLowerCase()}`}
              >
                <Zap className="w-4 h-4 mr-2" />
                {t.studio?.paywall?.upgrade || "Upgrade"}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-slate-500 text-sm">
            <Sparkles className="w-4 h-4 inline mr-1" />
            {t.studio?.paywall?.freeNote || "Free users can preview scripts and blueprints, but cannot export videos."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
