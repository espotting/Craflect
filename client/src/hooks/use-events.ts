import { useMutation } from "@tanstack/react-query";

export function useTrackEvent() {
  return useMutation({
    mutationFn: async ({ eventName, metadata }: { eventName: string; metadata?: Record<string, any> }) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName, metadata }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to track event");
      return res.json();
    },
  });
}
