export function isMacPlatform() {
  // Überprüft, ob die Plattform ein Mac ist, um die Shortcut-Darstellung anzupassen.
  return typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
}

// Funktion nimmt zwei Parameter, einen Key/Taste Wie b. "N" und ein optionales Flag, ob es sich um ein Mac handelt
// ja -> ⌥N,
// nein -> Alt+N
export function formatAltShortcut(key: string, isMac = isMacPlatform()) {
  const normalizedKey = key.toUpperCase();
  return isMac ? `⌥${normalizedKey}` : `Alt+${normalizedKey}`;
}
