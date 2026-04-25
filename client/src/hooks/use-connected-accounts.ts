import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface ConnectedAccount {
  id: string;
  platform: 'tiktok' | 'reels' | 'shorts';
  accountHandle: string;
  accountUrl: string | null;
  followersCount: number | null;
  isPrimary: boolean;
  connectedAt: string;
}

export function useConnectedAccounts() {
  const { data: accounts = [], isLoading } = useQuery<ConnectedAccount[]>({
    queryKey: ['/api/user/accounts'],
    staleTime: 5 * 60 * 1000,
  });

  const connectMutation = useMutation({
    mutationFn: (data: {
      platform: string;
      accountHandle: string;
      accountUrl?: string;
      followersCount?: number;
      isPrimary?: boolean;
    }) => apiRequest('POST', '/api/user/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/import-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) =>
      apiRequest('DELETE', `/api/user/accounts/${accountId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/import-status'] });
    },
  });

  const accountsByPlatform = accounts.reduce((acc, account) => {
    if (!acc[account.platform]) acc[account.platform] = [];
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<string, ConnectedAccount[]>);

  return {
    accounts,
    accountsByPlatform,
    isLoading,
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
  };
}
