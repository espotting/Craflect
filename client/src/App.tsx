import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useTheme } from "@/hooks/use-theme";
import { LanguageProvider } from "@/hooks/use-language";

import Landing from "@/pages/landing";
import AuthWelcome from "@/pages/auth/welcome";
import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import ForgotPassword from "@/pages/auth/forgot-password";
import EmailConfirmation from "@/pages/auth/email-confirmation";
import AdminVerification from "@/pages/auth/admin-verification";
import Dashboard from "@/pages/dashboard";
import Discover from "@/pages/discover";
import Opportunities from "@/pages/opportunities";
import Insights from "@/pages/insights";
import Create from "@/pages/create";
import Workspace from "@/pages/workspace";
import Settings from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import FounderOverview from "@/pages/founder-overview";
import FounderUsers from "@/pages/founder-users";
import FounderSubscriptions from "@/pages/founder-subscriptions";
import FounderLogs from "@/pages/founder-logs";
import FounderSettings from "@/pages/founder-settings";
import PlanBilling from "@/pages/plan-billing";
import PerformancePage from "@/pages/performance";
import WaitlistPage from "@/pages/waitlist";
import FounderWaitlist from "@/pages/founder-waitlist";
import { TermsPage, BillingPage, PrivacyPage, CookiesPage, DpaPage, SecurityPage, ContactPage } from "@/pages/legal";
import FaqPage from "@/pages/faq";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/welcome" component={AuthWelcome} />
      <Route path="/signin" component={SignIn} />
      <Route path="/signup" component={SignUp} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/email-confirmation" component={EmailConfirmation} />
      <Route path="/admin-verification" component={AdminVerification} />
      <Route path="/auth">{() => <Redirect to="/welcome" />}</Route>
      <Route path="/pricing">{() => <Redirect to="/" />}</Route>
      <Route path="/onboarding" component={Onboarding} />
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
      <Route path="/system/founder/waitlist" component={FounderWaitlist} />
      <Route path="/system/founder/settings" component={FounderSettings} />
      <Route path="/system/logs">{() => <Redirect to="/system/founder/logs" />}</Route>
      <Route path="/system/settings">{() => <Redirect to="/system/founder/settings" />}</Route>
      <Route path="/plan-billing" component={PlanBilling} />
      <Route path="/performance" component={PerformancePage} />
      <Route path="/waitlist" component={WaitlistPage} />

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
      <Route path="/contact" component={ContactPage} />
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
