import { 
  LayoutDashboard, 
  Library, 
  Sparkles, 
  BarChart3, 
  Settings, 
  LogOut,
  Sun,
  Moon,
  Shield,
  Brain,
  CreditCard,
  FileText,
  Video,
  Lock,
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
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Progress } from "@/components/ui/progress";
import logoTransparent from "@/assets/logo-transparent.png";
import logoLight from "@/assets/logo-light.png";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { t } = useLanguage();

  const mainItems = [
    { title: t.sidebar.dashboard, url: "/dashboard", icon: LayoutDashboard },
    { title: t.sidebar.analyzedContent, url: "/library", icon: Library },
    { title: t.sidebar.insights, url: "/briefs", icon: Sparkles },
    { title: t.sidebar.analytics, url: "/analytics", icon: BarChart3 },
    { title: t.sidebar.scriptGenerator, url: "/script-generator", icon: FileText, comingSoon: true },
    { title: t.sidebar.videoBuilder, url: "/video-builder", icon: Video, comingSoon: true },
    { title: t.sidebar.planBilling, url: "/plan-billing", icon: CreditCard },
  ];

  return (
    <Sidebar variant="inset" className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 flex flex-row items-center justify-between">
        <img 
          src={isDark ? logoTransparent : logoLight} 
          alt="Craflect" 
          className="h-10 w-auto object-contain"
          data-testid="logo-sidebar" 
        />
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={isDark ? t.common.switchLight : t.common.switchDark}
          data-testid="button-theme-toggle"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2">
            {t.sidebar.platform}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive = location === item.url;
                const isComingSoon = (item as any).comingSoon;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isComingSoon ? "opacity-50 cursor-not-allowed text-muted-foreground" : isActive ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}
                      onClick={() => !isComingSoon && setLocation(item.url)}
                    >
                      <button className="flex items-center gap-3 w-full" data-testid={`nav-${item.url.replace("/", "")}`} disabled={isComingSoon}>
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                        <span className="font-medium">{item.title}</span>
                        {isComingSoon && <Lock className="w-3 h-3 ml-auto text-muted-foreground" />}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!user?.onboardingCompleted && (
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{t.sidebar.setupProgress}</span>
                  <span className="text-primary font-bold">0%</span>
                </div>
                <Progress value={0} className="h-1 bg-muted" />
                <p className="text-xs text-muted-foreground">{t.sidebar.completeOnboarding}</p>
              </button>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2">
            {t.sidebar.system}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {user?.isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/admin"}
                    className={location === "/admin" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}
                    onClick={() => setLocation("/admin")}
                  >
                    <button className="flex items-center gap-3 w-full" data-testid="nav-admin">
                      <Shield className="w-5 h-5" />
                      <span className="font-medium">{t.sidebar.admin}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {user?.isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/intelligence"}
                    className={location === "/intelligence" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}
                    onClick={() => setLocation("/intelligence")}
                  >
                    <button className="flex items-center gap-3 w-full" data-testid="nav-intelligence">
                      <Brain className="w-5 h-5" />
                      <span className="font-medium">{t.sidebar.intelligence}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === "/settings"}
                  className={location === "/settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}
                  onClick={() => setLocation("/settings")}
                >
                  <button className="flex items-center gap-3 w-full" data-testid="nav-settings">
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">{t.sidebar.settings}</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-accent/50 border border-border">
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
