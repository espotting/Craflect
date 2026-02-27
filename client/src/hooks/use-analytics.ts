import { useQuery } from "@tanstack/react-query";

interface WorkspaceAnalytics {
  sourceCount: number;
  generatedCount: number;
  briefCount: number;
  totalViews: number;
  avgEngagement: number;
  avgRetention: number;
  performanceData: Array<{
    id: string;
    generatedContentId: string;
    platform: string;
    views: number;
    engagement: number;
    retention: number;
    createdAt: string;
  }>;
}

export function useWorkspaceAnalytics(workspaceId: string | undefined) {
  return useQuery<WorkspaceAnalytics>({
    queryKey: ["/api/workspaces", workspaceId, "analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/analytics`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}
