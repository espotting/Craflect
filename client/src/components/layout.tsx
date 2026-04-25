import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, Component, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { SmartPopup } from "./smart-popup";
import { PlatformToggle } from "@/components/platform-toggle";
import { usePlatform } from "@/hooks/use-platform";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

class PopupErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  componentDidCatch() { this.setState({ crashed: true }); }
  render() { return this.state.crashed ? null : this.props.children; }
}

const userRoutes = ["/home", "/opportunities", "/create", "/workspace", "/insights", "/settings", "/plan-billing", "/onboarding"];
const adminRoutes = ["/system/founder", "/system/founder/waitlist", "/system/logs", "/system/settings"];


export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();
  const { platform, setPlatform } = usePlatform();
  const queryClient = useQueryClient();

  const isAdmin = (user as any)?.isAdmin === true;

  const { data: streakData } = useQuery<{ streak: number }>({
    queryKey: ['/api/user/streak'],
    staleTime: 10 * 60 * 1000,
    enabled: !isAdmin,
  });

  const updatePlatformMutation = useMutation({
    mutationFn: (newPlatform: string) =>
      apiRequest("PATCH", "/api/user/preferences", { active_platform: newPlatform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-signal"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed/personalized"] });
    },
  });

  const handlePlatformChange = (p: any) => {
    setPlatform(p);
    updatePlatformMutation.mutate(p);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (isAdmin && userRoutes.some(r => location === r)) {
        setLocation("/system/founder");
        return;
      }
      if (!isAdmin && adminRoutes.some(r => location === r)) {
        setLocation("/home");
        return;
      }
      if (!isAdmin && !user.onboardingCompleted && location !== "/onboarding") {
        setLocation("/onboarding");
      }
    }
  }, [isLoading, isAuthenticated, user, location, setLocation, isAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-display animate-pulse">{t.common.loadingEngine}</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 relative z-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 dark:bg-secondary/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
          
          <header className="flex items-center h-16 px-6 border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent -ml-2 mr-4" />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              {!isAdmin && (streakData?.streak ?? 0) > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 8,
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.15)',
                }}>
                  <span style={{ fontSize: 12 }}>🔥</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{streakData!.streak}</span>
                  <span style={{ fontSize: 10, color: 'rgba(245,158,11,0.5)' }}>day streak</span>
                </div>
              )}
              {!isAdmin && <PlatformToggle value={platform} onChange={handlePlatformChange} />}
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative z-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="max-w-6xl mx-auto h-full"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
      <PopupErrorBoundary><SmartPopup /></PopupErrorBoundary>
    </SidebarProvider>
  );
}
