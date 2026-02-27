import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Brief, GeneratedContent } from "@shared/schema";

export function useBriefs(workspaceId: string | undefined) {
  return useQuery<Brief[]>({
    queryKey: ["/api/workspaces", workspaceId, "briefs"],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/workspaces/${workspaceId}/briefs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch briefs");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}

export function useGenerateBrief(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<Brief>({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/workspaces/${workspaceId}/briefs/generate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", workspaceId, "briefs"] });
    },
  });
}

export function useGenerateFromBrief() {
  const queryClient = useQueryClient();
  return useMutation<GeneratedContent[], Error, { briefId: string; workspaceId: string }>({
    mutationFn: async ({ briefId }) => {
      const res = await apiRequest("POST", `/api/briefs/${briefId}/generate`);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", variables.workspaceId, "briefs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", variables.workspaceId, "generated"] });
    },
  });
}

export function useUpdateBriefStatus() {
  const queryClient = useQueryClient();
  return useMutation<Brief, Error, { briefId: string; status: string; workspaceId: string }>({
    mutationFn: async ({ briefId, status }) => {
      const res = await apiRequest("PATCH", `/api/briefs/${briefId}/status`, { status });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", variables.workspaceId, "briefs"] });
    },
  });
}
