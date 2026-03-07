import { DashboardLayout } from "@/components/layout";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SystemSettings() {
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
      <div className="space-y-6" data-testid="page-system-settings">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Settings className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-system-settings-title">
              {t.sidebar.systemSettings}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            System configuration and admin settings.
          </p>
        </div>
        <Card>
          <CardContent className="p-10 text-center">
            <Settings className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              System settings coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
