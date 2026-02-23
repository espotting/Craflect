import { 
  LayoutDashboard, 
  Library, 
  Sparkles, 
  BarChart3, 
  Settings, 
  LogOut,
  Hexagon
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

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Library", url: "/library", icon: Library },
  { title: "Daily Brief", url: "/briefs", icon: Sparkles },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar variant="inset" className="border-r border-white/5 bg-sidebar">
      <SidebarHeader className="p-4 flex flex-row items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
          <Hexagon className="w-5 h-5 text-white fill-white/20" />
        </div>
        <span className="font-display font-bold text-xl tracking-tight text-white text-glow">
          Craflect
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/40 uppercase tracking-wider text-xs font-semibold mb-2">
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
                      className={isActive ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "text-white/70 hover:text-white hover:bg-white/5"}
                      onClick={() => setLocation(item.url)}
                    >
                      <button className="flex items-center gap-3 w-full">
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-white/50'}`} />
                        <span className="font-medium">{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-white/40 uppercase tracking-wider text-xs font-semibold mb-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isActive ? "bg-primary/10 text-primary" : "text-white/70 hover:text-white hover:bg-white/5"}
                      onClick={() => setLocation(item.url)}
                    >
                      <button className="flex items-center gap-3 w-full">
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

      <SidebarFooter className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-secondary to-primary flex items-center justify-center text-white font-bold text-sm">
            {user?.firstName?.[0] || user?.email?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : "Creator"}
            </p>
            <p className="text-xs text-white/50 truncate">{user?.email || "Pro Plan"}</p>
          </div>
          <button 
            onClick={() => logout()}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
