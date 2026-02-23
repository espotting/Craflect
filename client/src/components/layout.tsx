import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-white/50 font-display animate-pulse">Loading Craflect Engine...</p>
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
      <div className="flex min-h-screen w-full bg-[#0a0a0c] text-white overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 relative z-0 overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
          
          <header className="flex items-center h-16 px-6 border-b border-white/5 bg-background/50 backdrop-blur-xl sticky top-0 z-10">
            <SidebarTrigger className="text-white/70 hover:text-white hover:bg-white/10 -ml-2 mr-4" />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 neon-border">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                System Online
              </span>
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
    </SidebarProvider>
  );
}
