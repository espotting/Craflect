import { useLanguage } from "@/hooks/use-language";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageSwitcherProps {
  variant?: "icon" | "pill";
  className?: string;
}

export function LanguageSwitcher({ variant = "icon", className = "" }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  if (variant === "pill") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-full bg-muted hover:bg-accent text-foreground transition-all border border-border text-sm font-medium ${className}`}
            data-testid="button-language-switcher"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase text-xs tracking-wider">{language}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          <DropdownMenuItem
            onClick={() => setLanguage("en")}
            className={`gap-2 ${language === "en" ? "bg-accent" : ""}`}
            data-testid="button-lang-en"
          >
            <span className="text-base">🇬🇧</span>
            English
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setLanguage("fr")}
            className={`gap-2 ${language === "fr" ? "bg-accent" : ""}`}
            data-testid="button-lang-fr"
          >
            <span className="text-base">🇫🇷</span>
            Français
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`p-2.5 rounded-full bg-muted hover:bg-accent text-foreground transition-all border border-border ${className}`}
          data-testid="button-language-switcher"
        >
          <Globe className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem
          onClick={() => setLanguage("en")}
          className={`gap-2 ${language === "en" ? "bg-accent" : ""}`}
          data-testid="button-lang-en"
        >
          <span className="text-base">🇬🇧</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage("fr")}
          className={`gap-2 ${language === "fr" ? "bg-accent" : ""}`}
          data-testid="button-lang-fr"
        >
          <span className="text-base">🇫🇷</span>
          Français
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
