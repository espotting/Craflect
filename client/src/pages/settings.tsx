import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Bell, Shield, Key, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <DashboardLayout>
      <div className="mb-10">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and platform preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-2 flex-shrink-0">
          {[
            { id: 'profile', label: 'Profile', icon: User, active: true },
            { id: 'notifications', label: 'Notifications', icon: Bell, active: false },
            { id: 'security', label: 'Security', icon: Shield, active: false },
            { id: 'api', label: 'API Keys', icon: Key, active: false },
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
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">Profile Information</h2>
          
          <div className="space-y-6 max-w-lg">
            <div className="flex items-center gap-6 pb-6 border-b border-border">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" className="w-20 h-20 rounded-full shadow-lg" data-testid="img-avatar" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white shadow-lg neon-border">
                  {user?.firstName?.[0] || user?.email?.[0] || "U"}
                </div>
              )}
              <div>
                <Button variant="outline" className="border-border hover:bg-accent text-foreground mb-2">
                  Change Avatar
                </Button>
                <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <Input 
                className="bg-background border-border text-foreground h-12 rounded-xl focus-visible:ring-primary"
                defaultValue={user?.firstName ? `${user.firstName} ${user.lastName || ''}` : ""}
                data-testid="input-name"
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <Input 
                disabled
                className="bg-muted border-border text-muted-foreground h-12 rounded-xl cursor-not-allowed"
                defaultValue={user?.email || ""}
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground mt-1">Managed via Google account.</p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Appearance</label>
              <Button 
                variant="outline" 
                onClick={toggleTheme}
                className="w-fit border-border text-foreground hover:bg-accent gap-2"
                data-testid="button-toggle-theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </Button>
            </div>

            <div className="pt-6">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-11 neon-border" data-testid="button-save-settings">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
