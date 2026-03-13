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
import Opportunities from "@/pages/opportunities";
import Insights from "@/pages/insights";
import Create from "@/pages/create";
import Workspace from "@/pages/workspace";
import Settings from "@/pages/settings";
import Welcome from "@/pages/welcome";
import FounderOverview from "@/pages/founder-overview";
import FounderUsers from "@/pages/founder-users";
import FounderSubscriptions from "@/pages/founder-subscriptions";
import FounderLogs from "@/pages/founder-logs";
import FounderSettings from "@/pages/founder-settings";
import PlanBilling from "@/pages/plan-billing";
import { TermsPage, BillingPage, PrivacyPage, CookiesPage, DpaPage, SecurityPage } from "@/pages/legal";
import FaqPage from "@/pages/faq";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/pricing">{() => <Redirect to="/" />}</Route>
      <Route path="/welcome" component={Welcome} />
      <Route path="/home" component={Dashboard} />
      <Route path="/dashboard">{() => <Redirect to="/home" />}</Route>
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/discover">{() => <Redirect to="/opportunities" />}</Route>
      <Route path="/insights" component={Insights} />
      <Route path="/create" component={Create} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/settings" component={Settings} />
      <Route path="/system/founder" component={FounderOverview} />
      <Route path="/system/founder/users" component={FounderUsers} />
      <Route path="/system/founder/subscriptions" component={FounderSubscriptions} />
      <Route path="/system/founder/logs" component={FounderLogs} />
      <Route path="/system/founder/settings" component={FounderSettings} />
      <Route path="/system/logs">{() => <Redirect to="/system/founder/logs" />}</Route>
      <Route path="/system/settings">{() => <Redirect to="/system/founder/settings" />}</Route>
      <Route path="/plan-billing" component={PlanBilling} />

      <Route path="/trend-radar">{() => <Redirect to="/opportunities" />}</Route>
      <Route path="/library">{() => <Redirect to="/opportunities" />}</Route>
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
