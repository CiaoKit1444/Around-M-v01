/**
 * useKeyboardShortcuts — Global keyboard shortcut registration.
 *
 * Registers Cmd/Ctrl+K for command palette, Escape to close dialogs,
 * and other navigation shortcuts.
 */
import { useEffect } from "react";

type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: ShortcutHandler;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const metaMatch = shortcut.meta ? e.metaKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : true;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          // Don't fire when user is typing in an input
          const target = e.target as HTMLElement;
          const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
          if (isInput && shortcut.key !== "Escape") continue;

          e.preventDefault();
          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}

export type { Shortcut };
