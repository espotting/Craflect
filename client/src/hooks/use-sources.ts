import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ContentSource, GeneratedContent } from "@shared/schema";

export function useSources(workspaceId: string | undefined) {
  return useQuery<ContentSource[]>({
    queryKey: ["/api/workspaces", workspaceId, "sources"],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/workspaces/${workspaceId}/sources`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sources");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSource(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<ContentSource, Error, { title: string; type: string; rawContent?: string; fileUrl?: string }>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", `/api/workspaces/${workspaceId}/sources`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", workspaceId, "sources"] });
    },
  });
}

export function useGenerateFromSource() {
  const queryClient = useQueryClient();
  return useMutation<GeneratedContent[], Error, { sourceId: string; workspaceId: string }>({
    mutationFn: async ({ sourceId }) => {
      const res = await apiRequest("POST", `/api/sources/${sourceId}/generate`);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", variables.workspaceId, "sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces", variables.workspaceId, "generated"] });
    },
  });
}

export function useGeneratedContent(workspaceId: string | undefined) {
  return useQuery<GeneratedContent[]>({
    queryKey: ["/api/workspaces", workspaceId, "generated"],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/workspaces/${workspaceId}/generated`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch generated content");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}
