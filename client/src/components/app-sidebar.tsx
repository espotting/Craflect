import { 
  LayoutDashboard, 
  Target,
  Sparkles,
  FolderKanban,
  BarChart3,
  Settings, 
  LogOut,
  CreditCard,
  Crown,
  ScrollText,
  Wrench,
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
import logoTransparent from "@/assets/logo-transparent.png";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isAdmin = (user as any)?.isAdmin === true;

  const userItems = [
    { title: t.sidebar.home, url: "/home", icon: LayoutDashboard },
    { title: t.sidebar.opportunities, url: "/opportunities", icon: Target },
    { title: t.sidebar.create, url: "/create", icon: Sparkles },
    { title: t.sidebar.workspace, url: "/workspace", icon: FolderKanban },
    { title: t.sidebar.insights, url: "/insights", icon: BarChart3 },
  ];

  const userSystemItems = [
    { title: t.sidebar.settings, url: "/settings", icon: Settings },
    { title: t.sidebar.planBilling, url: "/plan-billing", icon: CreditCard },
  ];

  const adminItems = [
    { title: t.sidebar.founderDashboard, url: "/system/founder", icon: Crown },
    { title: t.sidebar.logs, url: "/system/logs", icon: ScrollText },
    { title: t.sidebar.systemSettings, url: "/system/settings", icon: Wrench },
  ];

  const mainItems = isAdmin ? adminItems : userItems;

  return (
    <Sidebar variant="inset" className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 flex flex-row items-center justify-between gap-2">
        <img 
          src={logoTransparent} 
          alt="Craflect" 
          className="h-10 w-auto object-contain"
          data-testid="logo-sidebar" 
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive = location === item.url || (!isAdmin && item.url === "/home" && location === "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}
                      onClick={() => setLocation(item.url)}
                    >
                      <button className="flex items-center gap-3 w-full" data-testid={`nav-${item.url.replace(/\//g, '-').replace(/^-/, '')}`}>
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                        <span className="font-medium">{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isAdmin && !user?.onboardingCompleted && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2">
              {t.sidebar.gettingStarted}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <button
                onClick={() => setLocation("/welcome")}
                className="w-full p-3 rounded-md bg-primary/5 border border-primary/20 space-y-2 text-left hover-elevate"
                data-testid="button-onboarding-progress"
              >
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="text-muted-foreground font-medium">{t.sidebar.setupProgress}</span>
                  <span className="text-primary font-bold">0%</span>
                </div>
                <Progress value={0} className="h-1 bg-muted" />
                <p className="text-xs text-muted-foreground">{t.sidebar.completeOnboarding}</p>
              </button>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isAdmin && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2">
              {t.sidebar.system}
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
                        className={isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}
                        onClick={() => setLocation(item.url)}
                      >
                        <button className="flex items-center gap-3 w-full" data-testid={`nav-${item.url.replace("/", "")}`}>
                          <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                          <span className="font-medium">{item.title}</span>
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
            <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-secondary to-primary flex items-center justify-center text-white font-bold text-sm">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="text-username">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : t.common.creator}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
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
        <div className="mt-2 flex justify-center">
          <LanguageSwitcher variant="pill" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
