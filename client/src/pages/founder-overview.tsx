import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { KPIPriorityBar } from "@/components/dashboard/KPIPriorityBar";
import { PlatformHealthSection } from "@/components/dashboard/PlatformHealthSection";
import { ProductUsageSection } from "@/components/dashboard/ProductUsageSection";
import { SaaSMetricsSection } from "@/components/dashboard/SaaSMetricsSection";
import { GrowthMetricsSection } from "@/components/dashboard/GrowthMetricsSection";

export default function FounderOverview() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !(user as any)?.isAdmin) {
      setLocation("/home");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || !(user as any)?.isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-10" data-testid="page-founder-overview">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-overview-title">Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">Platform performance at a glance</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live data
          </div>
        </div>

        <KPIPriorityBar />
        <div className="border-t border-border" />
        <PlatformHealthSection />
        <div className="border-t border-border" />
        <ProductUsageSection />
        <div className="border-t border-border" />
        <SaaSMetricsSection />
        <div className="border-t border-border" />
        <GrowthMetricsSection />

        <footer className="pt-8 pb-4 text-center text-sm text-muted-foreground/50">
          <p>Craflect Founder Dashboard v2.0</p>
        </footer>
      </div>
    </DashboardLayout>
  );
}
