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
import Library from "@/pages/library";
import Ideas from "@/pages/ideas";
import ScriptGenerator from "@/pages/script-generator";
import VideoBuilder from "@/pages/video-builder";
import Projects from "@/pages/projects";
import Settings from "@/pages/settings";
import Welcome from "@/pages/welcome";
import Admin from "@/pages/admin";
import Intelligence from "@/pages/intelligence";
import Pricing from "@/pages/pricing";
import PlanBilling from "@/pages/plan-billing";
import ViralTemplatesPage from "@/pages/viral-templates";
import RemixEnginePage from "@/pages/remix-engine";
import PredictedViewsPage from "@/pages/predicted-views";
import { TermsPage, BillingPage, PrivacyPage, CookiesPage, DpaPage, SecurityPage } from "@/pages/legal";
import FaqPage from "@/pages/faq";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/trend-radar" component={TrendRadar} />
      <Route path="/library" component={Library} />
      <Route path="/ideas" component={Ideas} />
      <Route path="/script-generator" component={ScriptGenerator} />
      <Route path="/video-builder" component={VideoBuilder} />
      <Route path="/projects" component={Projects} />
      <Route path="/viral-templates" component={ViralTemplatesPage} />
      <Route path="/remix-engine" component={RemixEnginePage} />
      <Route path="/predicted-views" component={PredictedViewsPage} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route path="/intelligence" component={Intelligence} />
      <Route path="/plan-billing" component={PlanBilling} />
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
