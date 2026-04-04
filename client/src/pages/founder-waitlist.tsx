import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClipboardList,
  Send,
  CheckCircle,
  Clock,
  Search,
  Users,
  Mail,
} from "lucide-react";

interface WaitlistEntry {
  id: string;
  firstName: string;
  email: string;
  niche: string | null;
  why: string | null;
  status: string;
  inviteToken: string | null;
  inviteSentAt: string | null;
  createdAt: string;
}

export default function FounderWaitlist() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "invited">("all");

  useEffect(() => {
    if (!authLoading && !(user as any)?.isAdmin) {
      setLocation("/home");
    }
  }, [authLoading, user, setLocation]);

  const { data: entries = [], isLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ["/api/admin/waitlist"],
    enabled: !!(user as any)?.isAdmin,
  });

  const inviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/waitlist/${id}/invite`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waitlist"] });
      toast({ title: "Invite sent", description: "The invitation email has been sent." });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not send invite.", variant: "destructive" });
    },
  });

  if (authLoading || !(user as any)?.isAdmin) return null;

  const filtered = entries.filter((e) => {
    const matchSearch = !search || e.email.toLowerCase().includes(search.toLowerCase()) || e.firstName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const invitedCount = entries.filter((e) => e.status === "invited").length;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-founder-waitlist">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-waitlist-title">Waitlist</h1>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} total applications</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="w-4 h-4" />
              Total
            </div>
            <div className="text-2xl font-bold text-foreground" data-testid="stat-waitlist-total">{entries.length}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              Pending
            </div>
            <div className="text-2xl font-bold text-amber-400" data-testid="stat-waitlist-pending">{pendingCount}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Invited
            </div>
            <div className="text-2xl font-bold text-emerald-400" data-testid="stat-waitlist-invited">{invitedCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-waitlist-search"
            />
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["all", "pending", "invited"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterStatus === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                data-testid={`filter-${s}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No entries found</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Niche</th>
                  <th className="text-left p-3 font-medium">Why</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors" data-testid={`row-waitlist-${entry.id}`}>
                    <td className="p-3 font-medium text-foreground">{entry.firstName}</td>
                    <td className="p-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {entry.email}
                      </div>
                    </td>
                    <td className="p-3">
                      {entry.niche ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                          {entry.niche.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate">{entry.why || "—"}</td>
                    <td className="p-3">
                      {entry.status === "invited" ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Invited
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      {entry.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => inviteMutation.mutate(entry.id)}
                          disabled={inviteMutation.isPending}
                          className="text-xs"
                          data-testid={`button-invite-${entry.id}`}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Send Invite
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {entry.inviteSentAt ? new Date(entry.inviteSentAt).toLocaleDateString() : "Sent"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
