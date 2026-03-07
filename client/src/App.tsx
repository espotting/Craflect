import { Switch, Route, Redirect } from "wouter";
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
import Discover from "@/pages/discover";
import Create from "@/pages/create";
import Workspace from "@/pages/workspace";
import Settings from "@/pages/settings";
import Welcome from "@/pages/welcome";
import Admin from "@/pages/admin";
import Intelligence from "@/pages/intelligence";
import FounderDashboard from "@/pages/founder-dashboard";
import SystemLogs from "@/pages/system-logs";
import SystemSettings from "@/pages/system-settings";
import Pricing from "@/pages/pricing";
import PlanBilling from "@/pages/plan-billing";
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
      <Route path="/discover" component={Discover} />
      <Route path="/create" component={Create} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route path="/intelligence" component={Intelligence} />
      <Route path="/system/founder" component={FounderDashboard} />
      <Route path="/system/logs" component={SystemLogs} />
      <Route path="/system/settings" component={SystemSettings} />
      <Route path="/plan-billing" component={PlanBilling} />

      <Route path="/trend-radar">{() => <Redirect to="/discover" />}</Route>
      <Route path="/library">{() => <Redirect to="/discover" />}</Route>
      <Route path="/ideas">{() => <Redirect to="/workspace" />}</Route>
      <Route path="/script-generator">{() => <Redirect to="/create" />}</Route>
      <Route path="/video-builder">{() => <Redirect to="/create" />}</Route>
      <Route path="/projects">{() => <Redirect to="/workspace" />}</Route>
      <Route path="/viral-templates">{() => <Redirect to="/workspace" />}</Route>
      <Route path="/remix-engine">{() => <Redirect to="/create" />}</Route>
      <Route path="/predicted-views">{() => <Redirect to="/create" />}</Route>

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
