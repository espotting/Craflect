import { useQuery } from "@tanstack/react-query";
import type { Subscription } from "@shared/schema";

export function useSubscription() {
  return useQuery<Subscription>({
    queryKey: ["/api/subscription"],
  });
}
