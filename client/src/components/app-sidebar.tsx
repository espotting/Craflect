import { 
  LayoutDashboard, 
  Library, 
  Sparkles, 
  BarChart3, 
  Settings, 
  LogOut,
  Sun,
  Moon,
  Shield
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
import { Progress } from "@/components/ui/progress";
import logoTransparent from "@/assets/logo-transparent.png";
import logoLight from "@/assets/logo-light.png";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Analyzed Content", url: "/library", icon: Library },
  { title: "Insights", url: "/briefs", icon: Sparkles },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <Sidebar variant="inset" className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 flex flex-row items-center justify-between">
        <img 
          src={isDark ? logoTransparent : logoLight} 
          alt="Craflect" 
          style={{ height: isDark ? "59px" : "40px" }}
          className="w-auto object-contain"
          data-testid="logo-sidebar" 
        />
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          data-testid="button-theme-toggle"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isActive ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}
                      onClick={() => setLocation(item.url)}
                    >
                      <button className="flex items-center gap-3 w-full" data-testid={`nav-${item.title.toLowerCase()}`}>
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                        <span className="font-medium">{item.title}</span>
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
              Getting Started
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <button
                onClick={() => setLocation("/welcome")}
                className="w-full p-3 rounded-md bg-primary/5 border border-primary/20 space-y-2 text-left hover-elevate"
                data-testid="button-onboarding-progress"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Setup progress</span>
                  <span className="text-primary font-bold">0%</span>
                </div>
                <Progress value={0} className="h-1 bg-muted" />
                <p className="text-xs text-muted-foreground">Complete onboarding to unlock all features</p>
              </button>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2">
            System
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
                      <span className="font-medium">Admin</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {settingsItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}
                      onClick={() => setLocation(item.url)}
                    >
                      <button className="flex items-center gap-3 w-full" data-testid={`nav-${item.title.toLowerCase()}`}>
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : "Creator"}
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
      </SidebarFooter>
    </Sidebar>
  );
}
