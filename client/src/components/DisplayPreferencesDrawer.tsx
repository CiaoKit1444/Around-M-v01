/**
 * DisplayPreferencesDrawer — Consolidated display preferences panel.
 *
 * Accessible from the TopBar via a single "Display" icon button.
 * Consolidates:
 *   - Font size (S / M / L / XL)
 *   - Theme (Dark / Light)
 *   - Language (admin portal — coming soon placeholder)
 *
 * Uses shadcn/ui Sheet for the drawer, consistent with the rest of the admin UI.
 */
import { Monitor, Sun, Moon, Type, Globe, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useFontSize, type FontSize } from "@/hooks/useFontSize";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; desc: string; px: string }[] = [
  { value: "S",  label: "S",  desc: "Compact",     px: "14px" },
  { value: "M",  label: "M",  desc: "Default",      px: "16px" },
  { value: "L",  label: "L",  desc: "Comfortable",  px: "18px" },
  { value: "XL", label: "XL", desc: "Accessibility", px: "20px" },
];

const THEME_OPTIONS = [
  { value: "dark" as const,  label: "Dark",  Icon: Moon },
  { value: "light" as const, label: "Light", Icon: Sun  },
];

const LANG_OPTIONS = [
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "th", label: "ไทย",      flag: "🇹🇭" },
  { code: "ja", label: "日本語",    flag: "🇯🇵" },
  { code: "zh", label: "中文",      flag: "🇨🇳" },
  { code: "ko", label: "한국어",    flag: "🇰🇷" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch",  flag: "🇩🇪" },
];

interface DisplayPreferencesDrawerProps {
  /** Render the trigger button inline (default) or as a standalone icon */
  compact?: boolean;
}

export function DisplayPreferencesDrawer({ compact = false }: DisplayPreferencesDrawerProps) {
  const { fontSize, setFontSize } = useFontSize();
  const { theme, toggleTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={400}>
      <Sheet>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 text-muted-foreground hover:text-foreground",
                  compact && "h-7 w-7"
                )}
                aria-label="Display preferences"
              >
                <Monitor size={compact ? 15 : 17} />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Display preferences
          </TooltipContent>
        </Tooltip>

        <SheetContent side="right" className="w-80 sm:w-80 flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Monitor size={16} className="text-muted-foreground" />
              Display Preferences
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {/* ── Font Size ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Type size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Text Size
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {FONT_SIZE_OPTIONS.map(({ value, label, desc, px }) => {
                  const isActive = fontSize === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setFontSize(value)}
                      aria-pressed={isActive}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-lg border py-3 gap-1 transition-all duration-150",
                        isActive
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <Check
                          size={10}
                          className="absolute top-1.5 right-1.5 text-primary"
                          strokeWidth={3}
                        />
                      )}
                      <span className={cn(
                        "font-bold leading-none",
                        value === "S"  && "text-xs",
                        value === "M"  && "text-sm",
                        value === "L"  && "text-base",
                        value === "XL" && "text-lg",
                      )}>
                        {label}
                      </span>
                      <span className="text-[10px] leading-none opacity-70">{desc}</span>
                      <span className="text-[9px] leading-none opacity-50">{px}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* ── Theme ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sun size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Theme
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map(({ value, label, Icon }) => {
                  const isActive = theme === value;
                  return (
                    <button
                      key={value}
                      onClick={() => { if (!isActive && toggleTheme) toggleTheme(); }}
                      aria-pressed={isActive}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-lg border py-4 gap-2 transition-all duration-150",
                        isActive
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <Check
                          size={10}
                          className="absolute top-1.5 right-1.5 text-primary"
                          strokeWidth={3}
                        />
                      )}
                      <Icon size={20} />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* ── Language ── */}
            <section>
              <div className="flex items-center gap-2 mb-1">
                <Globe size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Language
                </span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">
                  Coming soon
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Admin portal language switching is under development.
              </p>
              <div className="grid grid-cols-2 gap-1.5 opacity-50 pointer-events-none select-none">
                {LANG_OPTIONS.map(({ code, label, flag }) => (
                  <div
                    key={code}
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-border px-2.5 py-2",
                      code === "en" && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <span className="text-base leading-none">{flag}</span>
                    <span className="text-xs text-foreground truncate">{label}</span>
                    {code === "en" && <Check size={10} className="ml-auto text-primary" strokeWidth={3} />}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
