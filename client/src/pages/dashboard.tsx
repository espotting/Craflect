import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { usePlatform } from "@/hooks/use-platform";
import { DailySignalHero } from "@/components/daily-signal-hero";
import { FeedSection } from "@/components/feed-section";
import { usePlaybook } from "@/hooks/use-playbook";
import { RightPanel } from "@/components/dashboard/right-panel";

export default function Dashboard() {
  const { platform } = usePlatform();
  const { complete } = usePlaybook();

  useEffect(() => {
    complete('signal');
  }, []);

  const { data: prefs } = useQuery<{ primaryNiche: string | null; selectedNiches: string[]; active_platform?: string }>({
    queryKey: ['/api/user/preferences'],
  });

  const primaryNiche = prefs?.primaryNiche || 'finance';
  const activePlatform = prefs?.active_platform || platform || 'tiktok';
  const selectedNiches: string[] = prefs?.selectedNiches?.length ? prefs.selectedNiches : [primaryNiche];

  const { data: signal, isError: signalError } = useQuery<any>({
    queryKey: ['/api/daily-signal', activePlatform],
    queryFn: () => fetch(
      `/api/daily-signal?platform=${encodeURIComponent(activePlatform)}`,
      { credentials: 'include' }
    ).then(r => r.json()),
    refetchInterval: 72 * 60 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    enabled: !!primaryNiche,
  });

  const { data: patternsRaw } = useQuery<any[]>({
    queryKey: ['/api/patterns/list', activePlatform],
    queryFn: () => fetch(
      `/api/patterns/list?platform=${encodeURIComponent(activePlatform)}`,
      { credentials: 'include' }
    ).then(r => r.json()),
    staleTime: 30 * 60 * 1000,
  });
  const patterns = Array.isArray(patternsRaw) ? patternsRaw : [];

  return (
    <DashboardLayout>
      <div style={{ background: '#08080f', display: 'flex', gap: 20, alignItems: 'flex-start' }} data-testid="page-dashboard">
        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#7C5CFF', textTransform: 'uppercase', letterSpacing: '0.18em', padding: '16px 28px 8px' }}>
            Today's Intelligence
          </div>
          <DailySignalHero signal={signalError ? { signal: null } : signal} niche={primaryNiche} />
          <FeedSection niches={selectedNiches} platform={activePlatform} patterns={patterns} />
        </div>
        {/* Right panel */}
        <RightPanel />
      </div>
    </DashboardLayout>
  );
}
