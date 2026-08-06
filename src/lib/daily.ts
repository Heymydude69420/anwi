/** Local calendar day as YYYY-MM-DD — the seed for anything "of the day". */
export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/** Small string hash (FNV-1a), stable across reloads and browsers. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic pick for a given day.
 *
 * The same day always yields the same item, so a "photo of the day" stays put
 * however many times she opens the page, then changes at midnight. `salt`
 * keeps independent daily picks from moving in lockstep.
 */
export function pickForToday<T>(items: T[], salt = "", now: Date = new Date()): T | null {
  if (items.length === 0) return null;
  return items[hash(todayKey(now) + salt) % items.length];
}
