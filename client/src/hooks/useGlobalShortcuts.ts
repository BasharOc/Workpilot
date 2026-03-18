import { useEffect } from "react";

interface ShortcutDefinition {
  // Physische Taste, unabhängig vom Tastaturlayout, z. B. `KeyN`.
  code?: string;
  // Logische Taste, z. B. `Escape`.
  key?: string;
  // Zusätzliche Modifiertaste; aktuell nutzen wir nur `Alt` / `Option`.
  altKey?: boolean;
  // Erlaubt, Shortcuts kontextabhängig ein- oder auszuschalten.
  enabled?: boolean;
  // Standardverhalten des Browsers unterdrücken, falls gewünscht.
  preventDefault?: boolean;
  // Wird ausgeführt, sobald der Shortcut passt.
  handler: (event: KeyboardEvent) => void;
}

export function useGlobalShortcuts(shortcuts: ShortcutDefinition[]) {
  useEffect(() => {
    // Zentraler Keydown-Listener: prüft alle Shortcut-Definitionen der Reihe nach.
    function onKeyDown(event: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        // Inaktive Shortcuts werden komplett übersprungen.
        if (shortcut.enabled === false) continue;

        // `code` ist layout-unabhängig und gut für Buchstaben-Shortcuts geeignet.
        if (shortcut.code && event.code !== shortcut.code) continue;

        // `key` ist sinnvoll für Tasten wie Escape oder Enter.
        if (shortcut.key && event.key !== shortcut.key) continue;

        // Prüft Modifier wie Alt/Option.
        if (shortcut.altKey !== undefined && event.altKey !== shortcut.altKey) {
          continue;
        }

        // Verhindert z. B. Browser-Standardaktionen wie Fokuswechsel oder Sonderzeichen.
        if (shortcut.preventDefault ?? true) {
          event.preventDefault();
        }

        // Sobald ein Shortcut matched, wird sein Handler ausgeführt.
        shortcut.handler(event);

        // Danach abbrechen, damit nicht mehrere Shortcuts auf denselben Keydown reagieren.
        break;
      }
    }

    // Der Listener wird global auf `window` registriert.
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);
}
