import {
  Settings,
  CreditCard,
  Crown,
  ScrollText,
  Wrench,
  Users,
  ClipboardList,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";

// ── Custom SVG icons for user nav ─────────────────────────────────────────────

function IconToday() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
      <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor"/>
      <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" opacity=".45"/>
      <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" opacity=".45"/>
      <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" opacity=".45"/>
    </svg>
  );
}

function IconPatterns() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
      <path d="M2 8h12M8 2l4 6-4 6-4-6 4-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconStudio() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6.5 6l4 2-4 2V6z" fill="currentColor"/>
    </svg>
  );
}

function IconResults() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
      <path d="M2 12l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconPlaybook() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.5 6h5M5.5 9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const USER_ICONS: Record<string, React.ComponentType> = {
  '/home':        IconToday,
  '/patterns':    IconPatterns,
  '/create':      IconStudio,
  '/performance': IconResults,
  '/playbook':    IconPlaybook,
};

// ─────────────────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isAdmin = (user as any)?.isAdmin === true;

  const { data: prefs } = useQuery<{ primaryNiche: string | null; selectedNiches: string[] }>({
    queryKey: ["/api/user/preferences"],
    enabled: !isAdmin,
  });

  const { data: sidebarStats } = useQuery<{
    emergingPatterns: number;
    opportunities: number;
    trackedVideos: number;
  }>({
    queryKey: ["/api/sidebar/stats"],
    enabled: !isAdmin,
    refetchInterval: 5 * 60 * 1000,
  });

  const userItems = [
    { title: "Today",    url: "/home",        icon: Settings /* fallback */ },
    { title: "Patterns", url: "/patterns",    icon: Settings },
    { title: "Studio",   url: "/create",      icon: Settings },
    { title: "Results",  url: "/performance", icon: Settings },
    { title: "Playbook", url: "/playbook",    icon: Settings },
  ];

  const userSystemItems = [
    { title: t.sidebar?.settings || "Settings",       url: "/settings",     icon: Settings },
    { title: t.sidebar?.planBilling || "Plan & Billing", url: "/plan-billing", icon: CreditCard },
  ];

  const adminItems = [
    { title: t.sidebar?.founderDashboard || "Founder Dashboard", url: "/system/founder",               icon: Crown },
    { title: "Users",         url: "/system/founder/users",         icon: Users },
    { title: "Waitlist",      url: "/system/founder/waitlist",      icon: ClipboardList },
    { title: "Subscriptions", url: "/system/founder/subscriptions", icon: CreditCard },
    { title: t.sidebar?.logs || "Logs",                url: "/system/founder/logs",          icon: ScrollText },
    { title: t.sidebar?.systemSettings || "System Settings", url: "/system/founder/settings", icon: Wrench },
  ];

  const mainItems = isAdmin ? adminItems : userItems;

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-border bg-sidebar">

      {/* ── Header ── */}
      <SidebarHeader style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'linear-gradient(135deg,#7C5CFF,#c026d3)',
          flexShrink: 0,
        }} />
        {!isAdmin && prefs?.primaryNiche && (
          <div
            className="group-data-[collapsible=icon]:hidden"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.2)',
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C5CFF' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa' }}>
              {prefs.primaryNiche.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive =
                  location === item.url ||
                  (!isAdmin && item.url === "/home" && location === "/");

                const iconColor = isActive ? '#a78bfa' : 'rgba(255,255,255,0.35)';
                const CustomIcon = USER_ICONS[item.url];

                let counter: number | undefined;
                if (!isAdmin && sidebarStats) {
                  if (item.url === "/home")        counter = sidebarStats.emergingPatterns || undefined;
                  if (item.url === "/patterns")    counter = sidebarStats.opportunities || undefined;
                  if (item.url === "/performance") counter = sidebarStats.trackedVideos || undefined;
                }

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}
                      onClick={() => setLocation(item.url)}
                    >
                      <button
                        className="flex items-center gap-3 w-full"
                        style={{ position: 'relative' }}
                        data-testid={`nav-${item.url.replace(/\//g, "-").replace(/^-/, "")}`}
                      >
                        <div style={{ position: 'relative', flexShrink: 0, color: iconColor }}>
                          {CustomIcon ? <CustomIcon /> : <item.icon style={{ width: 16, height: 16 }} />}
                          {item.url === '/home' && (sidebarStats?.emergingPatterns ?? 0) > 0 && (
                            <div style={{
                              position: 'absolute', top: -2, right: -2,
                              width: 5, height: 5, borderRadius: '50%',
                              background: '#ef4444', border: '1px solid #0c0c17',
                            }} />
                          )}
                        </div>
                        <span className="font-medium flex-1 text-left group-data-[collapsible=icon]:hidden">{item.title}</span>
                        {counter !== undefined && (
                          <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary min-w-[20px] text-center group-data-[collapsible=icon]:hidden">
                            {counter}
                          </span>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isAdmin && !user?.onboardingCompleted && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2">
              {t.sidebar?.gettingStarted || "Getting Started"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <button
                onClick={() => setLocation("/onboarding")}
                className="w-full p-3 rounded-md bg-primary/5 border border-primary/20 space-y-2 text-left hover-elevate"
                data-testid="button-onboarding-progress"
              >
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="text-muted-foreground font-medium">
                    {t.sidebar?.setupProgress || "Setup Progress"}
                  </span>
                  <span className="text-primary font-bold">0%</span>
                </div>
                <Progress value={0} className="h-1 bg-muted" />
                <p className="text-xs text-muted-foreground">
                  {t.sidebar?.completeOnboarding || "Complete onboarding"}
                </p>
              </button>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isAdmin && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-2 group-data-[collapsible=icon]:hidden">
              {t.sidebar?.system || "System"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userSystemItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}
                        onClick={() => setLocation(item.url)}
                      >
                        <button
                          className="flex items-center gap-3 w-full"
                          data-testid={`nav-${item.url.replace("/", "")}`}
                        >
                          <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                          <span className="font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
              alt=""
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,#7C5CFF,#c026d3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            </div>
          )}
        </div>

        {/* Name + niche — hidden in icon mode */}
        <div
          className="group-data-[collapsible=icon]:hidden"
          style={{ padding: '0 12px 8px', textAlign: 'center' }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 2 }} data-testid="text-username">
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Creator'}
          </div>
          {prefs?.primaryNiche ? (
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7C5CFF' }}>
              {prefs.primaryNiche.replace(/_/g, ' ')}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              {user?.email || ''}
            </div>
          )}
        </div>

        {/* Logout button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => logout()}
            title="Log out"
            data-testid="button-logout"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)', transition: 'all .15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)';
            }}
          >
            <IconLogout />
          </button>
        </div>

        {/* Language switcher */}
        <div className="group-data-[collapsible=icon]:hidden" style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
          <LanguageSwitcher variant="pill" />
        </div>
      </SidebarFooter>

    </Sidebar>
  );
}
