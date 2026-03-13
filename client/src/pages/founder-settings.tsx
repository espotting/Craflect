import { useState } from 'react';
import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Key, Bell, Shield, Globe, Save, Copy, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function FounderSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newRegistration, setNewRegistration] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [errorAlerts, setErrorAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState(false);
  const apiKey = '••••••••••••••••••••••••';

  useEffect(() => {
    if (!authLoading && !(user as any)?.isAdmin) {
      setLocation("/home");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || !(user as any)?.isAdmin) return null;

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({ title: "API key copied to clipboard" });
  };

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your changes have been applied." });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6" data-testid="page-founder-settings">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-settings-title">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure platform settings and preferences</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto bg-muted/50">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="api" data-testid="tab-api">API</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-5 h-5 text-violet-500" />
                <h3 className="text-lg font-semibold text-foreground">Platform</h3>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="platform-name" className="text-muted-foreground">Platform Name</Label>
                    <Input id="platform-name" defaultValue="Craflect" className="bg-background border-border" data-testid="input-platform-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-email" className="text-muted-foreground">Support Email</Label>
                    <Input id="support-email" defaultValue="support@craflect.com" className="bg-background border-border" data-testid="input-support-email" />
                  </div>
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base text-foreground">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Temporarily disable access for all non-admin users</p>
                  </div>
                  <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} data-testid="switch-maintenance" />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base text-foreground">New User Registration</Label>
                    <p className="text-sm text-muted-foreground">Allow new users to sign up</p>
                  </div>
                  <Switch checked={newRegistration} onCheckedChange={setNewRegistration} data-testid="switch-registration" />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-6">
                <Key className="w-5 h-5 text-violet-500" />
                <h3 className="text-lg font-semibold text-foreground">API Keys</h3>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Live API Key</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={apiKey}
                        readOnly
                        className="bg-background border-border font-mono text-sm pr-20"
                        data-testid="input-api-key"
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={handleCopyApiKey} className="border-border" data-testid="button-copy-api-key">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="border-border" data-testid="button-regenerate-api-key">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Use this key to authenticate API requests</p>
                </div>
                <Separator className="bg-border" />
                <div className="space-y-2">
                  <Label htmlFor="webhook-url" className="text-muted-foreground">Webhook URL</Label>
                  <Input id="webhook-url" placeholder="https://your-domain.com/webhook" className="bg-background border-border" data-testid="input-webhook" />
                  <p className="text-xs text-muted-foreground">Receive real-time event notifications</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-5 h-5 text-violet-500" />
                <h3 className="text-lg font-semibold text-foreground">Email Notifications</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base text-foreground">New User Signups</Label>
                    <p className="text-sm text-muted-foreground">Get notified when new users register</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} data-testid="switch-email-notif" />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base text-foreground">Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">Receive weekly platform performance reports</p>
                  </div>
                  <Switch checked={weeklyReports} onCheckedChange={setWeeklyReports} data-testid="switch-weekly-reports" />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base text-foreground">Error Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get immediate alerts for critical errors</p>
                  </div>
                  <Switch checked={errorAlerts} onCheckedChange={setErrorAlerts} data-testid="switch-error-alerts" />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-5 h-5 text-violet-500" />
                <h3 className="text-lg font-semibold text-foreground">Security</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base text-foreground">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for admin access</p>
                  </div>
                  <Switch checked={twoFactor} onCheckedChange={setTwoFactor} data-testid="switch-2fa" />
                </div>
                <Separator className="bg-border" />
                <div className="space-y-2">
                  <Label htmlFor="session-timeout" className="text-muted-foreground">Session Timeout (hours)</Label>
                  <Input id="session-timeout" defaultValue="24" type="number" className="bg-background border-border max-w-xs" data-testid="input-session-timeout" />
                  <p className="text-xs text-muted-foreground">Automatically log out inactive users</p>
                </div>
                <Separator className="bg-border" />
                <div className="space-y-2">
                  <Label htmlFor="max-attempts" className="text-muted-foreground">Max Login Attempts</Label>
                  <Input id="max-attempts" defaultValue="5" type="number" className="bg-background border-border max-w-xs" data-testid="input-max-attempts" />
                  <p className="text-xs text-muted-foreground">Lock account after failed attempts</p>
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base text-foreground">IP Whitelist</Label>
                    <p className="text-sm text-muted-foreground">Restrict admin access to specific IPs</p>
                  </div>
                  <Switch checked={ipWhitelist} onCheckedChange={setIpWhitelist} data-testid="switch-ip-whitelist" />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700" data-testid="button-save-settings">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
