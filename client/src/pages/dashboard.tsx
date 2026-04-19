import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { usePlatform } from "@/hooks/use-platform";
import { PlatformToggle } from "@/components/platform-toggle";
import { DailySignalHero } from "@/components/daily-signal-hero";
import { FeedSection } from "@/components/feed-section";
import { usePlaybook } from "@/hooks/use-playbook";

export default function Dashboard() {
  const { platform, setPlatform } = usePlatform();
  const { complete } = usePlaybook();

  useEffect(() => {
    complete('signal');
  }, []);

  const { data: signal, isError: signalError } = useQuery<any>({
    queryKey: ['/api/daily-signal'],
    queryFn: () => fetch('/api/daily-signal', { credentials: 'include' }).then(r => r.json()),
    refetchInterval: 72 * 60 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: feed, isError: feedError } = useQuery<any>({
    queryKey: ['/api/feed/personalized', platform],
    queryFn: () =>
      fetch(`/api/feed/personalized${platform !== 'all' ? '?platform=' + platform : ''}`, {
        credentials: 'include',
      }).then(r => r.json()),
    retry: 1,
  });

  const { data: prefs } = useQuery<{ primaryNiche: string | null; selectedNiches: string[] }>({
    queryKey: ['/api/user/preferences'],
  });

  const primaryNiche = prefs?.primaryNiche || feed?.primaryNiche || 'finance';
  const selectedNiches: string[] =
    prefs?.selectedNiches?.length ? prefs.selectedNiches :
    feed?.selectedNiches?.length ? feed.selectedNiches :
    [primaryNiche];

  return (
    <DashboardLayout>
      <div style={{ background: '#08080f', minHeight: '100vh' }} data-testid="page-dashboard">
        <div style={{
          display: 'flex', justifyContent: 'flex-end', padding: '14px 28px 0',
          background: '#08080f',
        }}>
          <PlatformToggle value={platform} onChange={setPlatform} />
        </div>

        <DailySignalHero signal={signalError ? { signal: null } : signal} niche={primaryNiche} />
        <FeedSection niches={selectedNiches} platform={platform} feedData={feed} />
      </div>
    </DashboardLayout>
  );
}
