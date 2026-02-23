import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Bell, Shield, Key } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Settings() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="mb-10">
        <h1 className="font-display text-4xl font-bold text-white mb-2 text-glow">Settings</h1>
        <p className="text-white/50">Manage your account and platform preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Nav */}
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
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 glass-card rounded-2xl p-8 border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-6">Profile Information</h2>
          
          <div className="space-y-6 max-w-lg">
            <div className="flex items-center gap-6 pb-6 border-b border-white/5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white shadow-lg neon-border">
                {user?.firstName?.[0] || user?.email?.[0] || "U"}
              </div>
              <div>
                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white mb-2">
                  Change Avatar
                </Button>
                <p className="text-xs text-white/40">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-white/70">Full Name</label>
              <Input 
                className="bg-background border-white/10 text-white h-12 rounded-xl focus-visible:ring-primary"
                defaultValue={user?.firstName ? `${user.firstName} ${user.lastName || ''}` : ""}
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium text-white/70">Email Address</label>
              <Input 
                disabled
                className="bg-background/50 border-white/5 text-white/50 h-12 rounded-xl cursor-not-allowed"
                defaultValue={user?.email || ""}
              />
              <p className="text-xs text-white/40 mt-1">Managed via Replit Auth.</p>
            </div>

            <div className="pt-6">
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 h-11 neon-border">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
