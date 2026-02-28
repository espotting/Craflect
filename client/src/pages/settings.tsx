import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Bell, Shield, Key, Sun, Moon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");

  const saveMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const res = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t.common.settingsSaved, description: t.common.profileUpdated });
    },
    onError: () => {
      toast({ title: t.common.error, description: t.common.saveFailed, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({ firstName, lastName });
  };

  return (
    <DashboardLayout>
      <div className="mb-10">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2" data-testid="text-settings-title">{t.settings.title}</h1>
        <p className="text-muted-foreground">{t.settings.subtitle}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-2 flex-shrink-0">
          {[
            { id: 'profile', label: t.settings.profile, icon: User, active: true },
            { id: 'notifications', label: t.settings.notifications, icon: Bell, active: false },
            { id: 'security', label: t.settings.security, icon: Shield, active: false },
            { id: 'api', label: t.settings.apiKeys, icon: Key, active: false },
          ].map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                item.active 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              data-testid={`tab-${item.id}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 glass-card rounded-2xl p-8 border-border">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">{t.settings.profileInfo}</h2>
          
          <div className="space-y-6 max-w-lg">
            <div className="flex items-center gap-6 pb-6 border-b border-border">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" className="w-20 h-20 rounded-full shadow-lg" data-testid="img-avatar" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white shadow-lg neon-border">
                  {firstName?.[0] || user?.email?.[0] || "U"}
                </div>
              )}
              <div>
                <Button variant="outline" className="border-border hover:bg-accent text-foreground mb-2">
                  {t.settings.changeAvatar}
                </Button>
                <p className="text-xs text-muted-foreground">{t.settings.avatarHint}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">{t.settings.firstNameLabel}</label>
                <Input 
                  className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  data-testid="input-first-name"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">{t.settings.lastNameLabel}</label>
                <Input 
                  className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  data-testid="input-last-name"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">{t.settings.emailLabel}</label>
              <Input 
                disabled
                className="bg-muted border-border text-muted-foreground h-12 rounded-xl cursor-not-allowed"
                defaultValue={user?.email || ""}
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground mt-1">{t.settings.emailManaged}</p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">{t.settings.appearance}</label>
              <Button 
                variant="outline" 
                onClick={toggleTheme}
                className="w-fit border-border text-foreground hover:bg-accent gap-2"
                data-testid="button-toggle-theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDark ? t.settings.switchLight : t.settings.switchDark}
              </Button>
            </div>

            <div className="pt-6">
              <Button 
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-11 neon-border" 
                data-testid="button-save-settings"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t.common.save}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
