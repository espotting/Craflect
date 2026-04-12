import { type Platform } from "@/hooks/use-platform";

const PLATFORM_OPTIONS: Array<{ value: Platform; label: string }> = [
  { value: "all", label: "All" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
];

interface PlatformToggleProps {
  value: Platform;
  onChange: (p: Platform) => void;
}

export function PlatformToggle({ value, onChange }: PlatformToggleProps) {
  return (
    <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 4 }}>
      {PLATFORM_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 14px",
              borderRadius: 7,
              border: "none",
              background: active ? "rgba(124,92,255,0.25)" : "transparent",
              color: active ? "#c4b5fd" : "rgba(255,255,255,0.4)",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
              outline: active ? "1px solid rgba(124,92,255,0.4)" : "none",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
