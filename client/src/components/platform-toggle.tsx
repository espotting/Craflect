import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import { type Platform } from "@/hooks/use-platform";
import { useQuery } from "@tanstack/react-query";

const PLATFORM_META: Record<string, { label: string; Icon: React.ComponentType<any>; color: string }> = {
  tiktok: { label: "TikTok", Icon: SiTiktok, color: "#ffffff" },
  instagram: { label: "Instagram", Icon: SiInstagram, color: "#E1306C" },
  youtube: { label: "YouTube", Icon: SiYoutube, color: "#FF0000" },
};

interface PlatformToggleProps {
  value: Platform;
  onChange: (p: Platform) => void;
}

export function PlatformToggle({ value, onChange }: PlatformToggleProps) {
  const { data: prefs } = useQuery<{ platforms?: string[] }>({
    queryKey: ["/api/user/preferences"],
    staleTime: 10 * 60 * 1000,
  });

  // Platforms the user selected during onboarding (default: tiktok only)
  const userPlatforms: string[] = (prefs as any)?.platforms?.length
    ? (prefs as any).platforms
    : ["tiktok"];

  const availablePlatforms = userPlatforms.filter(p => PLATFORM_META[p]);

  // Single platform — just show the logo, no toggle
  if (availablePlatforms.length <= 1) {
    const p = availablePlatforms[0] || "tiktok";
    const meta = PLATFORM_META[p];
    if (!meta) return null;
    const { Icon } = meta;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10, color: meta.color }}>
        <Icon style={{ width: 16, height: 16 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{meta.label}</span>
      </div>
    );
  }

  // Multiple platforms — show toggle (no "All" button)
  return (
    <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 4 }}>
      {availablePlatforms.map(p => {
        const meta = PLATFORM_META[p];
        if (!meta) return null;
        const active = value === p;
        const { Icon } = meta;
        return (
          <button
            key={p}
            onClick={() => onChange(p as Platform)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 7, border: "none",
              background: active ? "rgba(124,92,255,0.25)" : "transparent",
              color: active ? meta.color : "rgba(255,255,255,0.4)",
              fontSize: 12, fontWeight: active ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
              outline: active ? "1px solid rgba(124,92,255,0.4)" : "none",
            }}
          >
            <Icon style={{ width: 16, height: 16 }} />
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
