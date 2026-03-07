import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Loader2, Sparkles, Radar, Zap } from "lucide-react";

const icons = [Sparkles, Radar, Zap, Loader2];

export function AnimatedEmptyState({ className }: { className?: string }) {
  const { t } = useLanguage();
  const messages = [
    t.emptyStates.scanning,
    t.emptyStates.detecting,
    t.emptyStates.preparing,
    t.emptyStates.analyzing,
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [messages.length]);

  const Icon = icons[index];

  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className || ""}`} data-testid="animated-empty-state">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-7 h-7 text-primary animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-ping" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1 transition-all duration-500">
        {messages[index]}
      </p>
      <div className="flex items-center gap-1 mt-3">
        {messages.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === index ? "bg-primary w-4" : "bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
}
