import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

export default function SystemLogs() {
  const { t } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !(user as any)?.isAdmin) {
      setLocation("/home");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || !(user as any)?.isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="page-system-logs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ScrollText className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-logs-title">
              {t.sidebar.logs}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            System event logs and activity history.
          </p>
        </div>
        <Card>
          <CardContent className="p-10 text-center">
            <ScrollText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Logs viewer coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
