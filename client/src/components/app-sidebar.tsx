import {
  LayoutDashboard,
  Target,
  Sparkles,
  FolderKanban,
  TrendingUp,
  Settings,
  LogOut,
  CreditCard,
  Crown,
  ScrollText,
  Wrench,
  Users,
  ClipboardList,
  Home,
  PenLine,
  BarChart2,
  BookOpen,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import logoTransparent from "@/assets/logo-transparent.png";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isAdmin = (user as any)?.isAdmin === true;

  const { data: prefs } = useQuery<{ primaryNiche: string | null; selectedNiches: string[] }>({
    queryKey: ["/api/user/preferences"],
    enabled: !isAdmin,
  });

  const { data: sidebarStats } = useQuery<{
    emergingPatterns: number;
    opportunities: number;
    trackedVideos: number;
  }>({
    queryKey: ["/api/sidebar/stats"],
    enabled: !isAdmin,
    refetchInterval: 5 * 60 * 1000,
  });

  const userItems = [
    { title: "Today",    url: "/home",        icon: Home },
    { title: "Patterns", url: "/patterns",    icon: TrendingUp },
    { title: "Studio",   url: "/create",      icon: PenLine },
    { title: "Results",  url: "/performance", icon: BarChart2 },
    { title: "Playbook", url: "/playbook",    icon: BookOpen },
  ];

  const userSystemItems = [
    { title: t.sidebar?.settings || "Settings", url: "/settings", icon: Settings },
    { title: t.sidebar?.planBilling || "Plan & Billing", url: "/plan-billing", icon: CreditCard },
  ];

  const adminItems = [
    { title: t.sidebar?.founderDashboard || "Founder Dashboard", url: "/system/founder", icon: Crown },
    { title: "Users", url: "/system/founder/users", icon: Users },
    { title: "Waitlist", url: "/system/founder/waitlist", icon: ClipboardList },
    { title: "Subscriptions", url: "/system/founder/subscriptions", icon: CreditCard },
    { title: t.sidebar?.logs || "Logs", url: "/system/founder/logs", icon: ScrollText },
    { title: t.sidebar?.systemSettings || "System Settings", url: "/system/founder/settings", icon: Wrench },
  ];

  const mainItems = isAdmin ? adminItems : userItems;

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 flex flex-col gap-2">
        <div className="flex flex-row items-center justify-between gap-2">
          <img
            src={logoTransparent}
            alt="Craflect"
            className="h-10 w-auto object-contain group-data-[collapsible=icon]:h-7"
            data-testid="logo-sidebar"
          />
        </div>
        {!isAdmin && prefs?.primaryNiche && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit group-data-[collapsible=icon]:hidden">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary capitalize" data-testid="text-primary-niche">
              {prefs.primaryNiche.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive =
                  location === item.url ||
                  (!isAdmin && item.url === "/home" && location === "/");

                let counter: number | undefined;
                if (!isAdmin && sidebarStats) {
                  if (item.url === "/home") counter = sidebarStats.emergingPatterns || undefined;
                  if (item.url === "/patterns") counter = sidebarStats.opportunities || undefined;
                  if (item.url === "/performance") counter = sidebarStats.trackedVideos || undefined;
                }

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}
                      onClick={() => setLocation(item.url)}
                    >
                      <button
                        className="flex items-center gap-3 w-full"
                        data-testid={`nav-${item.url.replace(/\//g, "-").replace(/^-/, "")}`}
                      >
                        <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                        <span className="font-medium flex-1 text-left group-data-[collapsible=icon]:hidden">{item.title}</span>
                        {counter !== undefined && (
                          <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary min-w-[20px] text-center group-data-[collapsible=icon]:hidden">
                            {counter}
                          </span>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isAdmin && !user?.onboardingCompleted && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2">
              {t.sidebar?.gettingStarted || "Getting Started"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <button
                onClick={() => setLocation("/onboarding")}
                className="w-full p-3 rounded-md bg-primary/5 border border-primary/20 space-y-2 text-left hover-elevate"
                data-testid="button-onboarding-progress"
              >
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="text-muted-foreground font-medium">
                    {t.sidebar?.setupProgress || "Setup Progress"}
                  </span>
                  <span className="text-primary font-bold">0%</span>
                </div>
                <Progress value={0} className="h-1 bg-muted" />
                <p className="text-xs text-muted-foreground">
                  {t.sidebar?.completeOnboarding || "Complete onboarding"}
                </p>
              </button>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isAdmin && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2 group-data-[collapsible=icon]:hidden">
              {t.sidebar?.system || "System"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userSystemItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}
                        onClick={() => setLocation(item.url)}
                      >
                        <button
                          className="flex items-center gap-3 w-full"
                          data-testid={`nav-${item.url.replace("/", "")}`}
                        >
                          <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                          <span className="font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-accent/50 border border-border">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-secondary to-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium text-foreground truncate" data-testid="text-username">
              {user?.firstName
                ? `${user.firstName} ${user.lastName || ""}`
                : t.common?.creator || "Creator"}
            </p>
            {prefs?.primaryNiche ? (
              <p className="text-xs font-bold truncate" style={{ color: '#7C5CFF' }}>
                {prefs.primaryNiche.replace(/_/g, ' ')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            )}
          </div>
          <button
            onClick={() => logout()}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            title="Log out"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 flex justify-center group-data-[collapsible=icon]:hidden">
          <LanguageSwitcher variant="pill" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
