/**
 * FontSizeSwitcher — Compact S / M / L typographic scale toggle.
 *
 * Designed to sit in the TopBar alongside the theme toggle.
 * Uses useFontSize hook which scales the entire app via html font-size.
 */
import { useFontSize, type FontSize } from "@/hooks/useFontSize";
import { cn } from "@/lib/utils";

const SIZE_LABELS: Record<FontSize, string> = {
  S: "S",
  M: "M",
  L: "L",
};

const SIZE_TITLES: Record<FontSize, string> = {
  S: "Small text (compact)",
  M: "Medium text (default)",
  L: "Large text (comfortable)",
};

export function FontSizeSwitcher() {
  const { fontSize, setFontSize, sizes } = useFontSize();

  return (
    <div
      className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg px-1 py-1"
      role="group"
      aria-label="Text size"
    >
      {sizes.map((size) => {
        const isActive = fontSize === size;
        return (
          <button
            key={size}
            onClick={() => setFontSize(size)}
            title={SIZE_TITLES[size]}
            aria-pressed={isActive}
            className={cn(
              "w-7 h-6 rounded-md text-[11px] font-semibold transition-all duration-150 select-none",
              isActive
                ? "bg-zinc-700 text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            )}
          >
            {SIZE_LABELS[size]}
          </button>
        );
      })}
    </div>
  );
}
