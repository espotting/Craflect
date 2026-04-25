import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function usePlaybook() {
  const queryClient = useQueryClient();

  const { data: playbook } = useQuery({
    queryKey: ['/api/playbook/today'],
    queryFn: () => fetch('/api/playbook/today', { credentials: 'include' }).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const complete = useMutation({
    mutationFn: (task: 'signal' | 'patterns' | 'brief' | 'track') =>
      fetch('/api/playbook/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/playbook/today'] }),
  });

  return { playbook, complete: complete.mutate };
}
