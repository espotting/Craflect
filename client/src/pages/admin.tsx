import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderKanban, FileText, Sparkles, Activity, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !user.isAdmin) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Forbidden");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Forbidden");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const { data: events } = useQuery({
    queryKey: ["/api/admin/events"],
    queryFn: async () => {
      const res = await fetch("/api/admin/events", { credentials: "include" });
      if (!res.ok) throw new Error("Forbidden");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  if (!user?.isAdmin) return null;

  const kpis = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Workspaces", value: stats?.totalWorkspaces || 0, icon: FolderKanban, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Sources Uploaded", value: stats?.totalSources || 0, icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Content Generated", value: stats?.totalGenerated || 0, icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Briefs Created", value: stats?.totalBriefs || 0, icon: Activity, color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground" data-testid="text-admin-title">Admin Panel</h1>
            <p className="text-muted-foreground">Platform overview and user management.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((kpi, i) => (
            <Card key={i} className="glass-card border-border" data-testid={`card-kpi-${i}`}>
              <CardContent className="pt-6">
                {statsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ) : (
                  <>
                    <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} w-fit mb-3`}>
                      <kpi.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{kpi.label}</p>
                    <p className="text-3xl font-bold font-display text-foreground">{kpi.value}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glass-card border-border">
            <CardHeader>
              <CardTitle className="text-xl font-display text-foreground">All Users</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>User</span>
                    <span>Email</span>
                    <span>Provider</span>
                    <span>Joined</span>
                  </div>
                  {allUsers?.map((u: any) => (
                    <div key={u.id} className="grid grid-cols-4 gap-4 px-4 py-3 rounded-xl bg-muted/50 border border-border items-center" data-testid={`row-user-${u.id}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold text-xs">
                          {u.firstName?.[0] || u.email?.[0] || "?"}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">
                          {u.firstName ? `${u.firstName} ${u.lastName || ""}` : "—"}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground truncate">{u.email || "—"}</span>
                      <Badge variant="outline" className="w-fit rounded-full text-[10px]">{u.authProvider || "email"}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="text-xl font-display text-foreground">Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events && events.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {events.slice(0, 20).map((ev: any) => (
                    <div key={ev.id} className="p-3 rounded-lg bg-muted/50 border border-border" data-testid={`event-${ev.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="rounded-full text-[10px] font-bold">{ev.eventName}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ev.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        User: {ev.userId?.substring(0, 8)}...
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-8">No events recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
