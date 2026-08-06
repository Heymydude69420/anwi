/**
 * Relationship date maths.
 *
 * The old version derived the next monthiversary from a 30.44-day average,
 * which drifts off the real calendar date on roughly 2% of days — including
 * any day that *is* a monthiversary, where it returned a moment already in the
 * past and froze the countdown behind an `if (diff > 0)` guard. Everything
 * here works in real calendar months instead.
 */

export const ANNIVERSARY = new Date(2024, 9, 5, 0, 0, 0, 0); // 5 Oct 2024, local time

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function countdownTo(target: Date, from: Date = new Date()): Countdown {
  const total = Math.max(0, target.getTime() - from.getTime());
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total % 86_400_000) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
    seconds: Math.floor((total % 60_000) / 1000),
    total,
  };
}

/** Whole days since the anniversary. */
export function daysTogether(now: Date = new Date()): number {
  const start = new Date(ANNIVERSARY);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}

/** Whole calendar months since the anniversary — what the header should show. */
export function monthsTogether(now: Date = new Date()): number {
  let months =
    (now.getFullYear() - ANNIVERSARY.getFullYear()) * 12 +
    (now.getMonth() - ANNIVERSARY.getMonth());
  if (now.getDate() < ANNIVERSARY.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * The next monthiversary as a real calendar date.
 *
 * Anniversary day clamps to the last day of shorter months, so a 31st
 * anniversary still lands correctly in February.
 */
export function nextMonthiversary(now: Date = new Date()): { date: Date; number: number } {
  const day = ANNIVERSARY.getDate();

  const build = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay), 0, 0, 0, 0);
  };

  let candidate = build(now.getFullYear(), now.getMonth());
  if (candidate.getTime() <= now.getTime()) {
    candidate = build(now.getFullYear(), now.getMonth() + 1);
  }

  const number =
    (candidate.getFullYear() - ANNIVERSARY.getFullYear()) * 12 +
    (candidate.getMonth() - ANNIVERSARY.getMonth());

  return { date: candidate, number };
}

/**
 * The next yearly anniversary.
 *
 * The old page hardcoded "Oct 5th, 2026", so the day after it passed the card
 * would have counted toward nothing forever. This rolls on its own.
 */
export function nextAnniversary(now: Date = new Date()): { date: Date; years: number } {
  const day = ANNIVERSARY.getDate();
  const month = ANNIVERSARY.getMonth();

  let year = now.getFullYear();
  let candidate = new Date(year, month, day, 0, 0, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    year += 1;
    candidate = new Date(year, month, day, 0, 0, 0, 0);
  }

  return { date: candidate, years: year - ANNIVERSARY.getFullYear() };
}

/** Upcoming round-number day milestones, for the celebration banner. */
export function nextMilestone(now: Date = new Date()): { days: number; date: Date; away: number } | null {
  const current = daysTogether(now);
  const marks = [500, 690, 1000, 1111, 1234, 1500, 2000, 2500, 3000, 5000, 10000];
  const target = marks.find((m) => m > current);
  if (!target) return null;

  const date = new Date(ANNIVERSARY);
  date.setDate(date.getDate() + target);
  date.setHours(0, 0, 0, 0);

  return { days: target, date, away: target - current };
}
