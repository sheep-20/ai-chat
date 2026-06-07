/** Extract [UNLOCK:key] markers from AI response and return cleaned text + keys */
export function parseUnlocks(raw: string): { cleaned: string; keys: string[] } {
  const keys: string[] = [];
  const cleaned = raw
    .replace(/\[UNLOCK:([a-z0-9_]+)\]/gi, (_, k) => { keys.push(k); return ''; })
    .trim();
  return { cleaned, keys };
}

/** Strip unlock markers for real-time display during streaming */
export function cleanForDisplay(text: string): string {
  return text
    .replace(/\[UNLOCK:[a-z0-9_]*\]/gi, '')
    .replace(/\s*\[UNLOCK:[a-z0-9_]*$/i, '')
    .trim();
}
