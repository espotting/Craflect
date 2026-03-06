import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useTheme } from "@/hooks/use-theme";
import { LanguageProvider } from "@/hooks/use-language";

import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import TrendRadar from "@/pages/trend-radar";
import Niches from "@/pages/niches";
import Patterns from "@/pages/patterns";
import Creators from "@/pages/creators";
import Videos from "@/pages/videos";
import Settings from "@/pages/settings";
import Welcome from "@/pages/welcome";
import Admin from "@/pages/admin";
import Intelligence from "@/pages/intelligence";
import Pricing from "@/pages/pricing";
import NicheData from "@/pages/niche-data";
import PlanBilling from "@/pages/plan-billing";
import { TermsPage, BillingPage, PrivacyPage, CookiesPage, DpaPage, SecurityPage } from "@/pages/legal";
import FaqPage from "@/pages/faq";
import VideoBuilder from "@/pages/video-builder";
import ScriptGenerator from "@/pages/script-generator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/trend-radar" component={TrendRadar} />
      <Route path="/niches" component={Niches} />
      <Route path="/patterns" component={Patterns} />
      <Route path="/creators" component={Creators} />
      <Route path="/videos" component={Videos} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route path="/intelligence" component={Intelligence} />
      <Route path="/niche-data" component={NicheData} />
      <Route path="/plan-billing" component={PlanBilling} />
      <Route path="/video-builder" component={VideoBuilder} />
      <Route path="/script-generator" component={ScriptGenerator} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/cookies" component={CookiesPage} />
      <Route path="/dpa" component={DpaPage} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/security" component={SecurityPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useTheme();
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
