import { motion } from "framer-motion";
import { useMemo } from "react";
import { todayKey } from "../lib/daily";
import { KEYS } from "../lib/storage";
import { usePersisted } from "../lib/usePersisted";
import { useToast } from "./Toast";

export interface MoodEntry {
  mood: string;
  emoji: string;
  at: number;
}

const MOODS = [
  { mood: "happy", emoji: "😊", tint: "var(--green-pale)" },
  { mood: "tired", emoji: "🥱", tint: "#e8e2f5" },
  { mood: "loved", emoji: "🥰", tint: "var(--rose-100)" },
  { mood: "silly", emoji: "🤪", tint: "#ffeccc" },
] as const;

const DAYS_SHOWN = 14;

/** Last N calendar days, oldest first. */
function recentDays(count: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    out.push({ key: todayKey(date), label: date.toLocaleDateString("en-US", { weekday: "narrow" }) });
  }
  return out;
}

export function MoodHistory({ onLog }: { onLog?: (mood: string, emoji: string) => void }) {
  const [log, setLog, ready] = usePersisted<MoodEntry[]>(KEYS.moodLog, []);
  const toast = useToast();

  const days = useMemo(() => recentDays(DAYS_SHOWN), []);

  // The most recent mood recorded on each day drives that day's column.
  const byDay = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    for (const entry of log) {
      const key = todayKey(new Date(entry.at));
      const existing = map.get(key);
      if (!existing || entry.at > existing.at) map.set(key, entry);
    }
    return map;
  }, [log]);

  const counts = useMemo(() => {
    const tally = new Map<string, number>();
    for (const entry of log) tally.set(entry.mood, (tally.get(entry.mood) ?? 0) + 1);
    return tally;
  }, [log]);

  const topMood = useMemo(() => {
    let best: { mood: string; n: number } | null = null;
    counts.forEach((n, mood) => {
      if (!best || n > best.n) best = { mood, n };
    });
    return best as { mood: string; n: number } | null;
  }, [counts]);

  const record = (mood: string, emoji: string) => {
    setLog((current) => [...current, { mood, emoji, at: Date.now() }].slice(-400));
    toast(`felt ${mood} ${emoji}`);
    onLog?.(mood, emoji);
  };

  if (!ready) return null;

  return (
    <div className="mood-block">
      <div className="mood-head">How are you feeling?</div>
      <p className="card-sub">Tap one — Ayush gets a mood update, and it's tracked below 💚</p>

      <div className="pill-grid">
        {MOODS.map((entry) => (
          <button
            key={entry.mood}
            className="btn btn-ghost mood-pill"
            style={{ background: entry.tint }}
            onClick={() => record(entry.mood, entry.emoji)}
          >
            {entry.emoji} {entry.mood}
          </button>
        ))}
      </div>

      <div className="mood-chart" role="img" aria-label={`Mood over the last ${DAYS_SHOWN} days`}>
        {days.map((day, index) => {
          const entry = byDay.get(day.key);
          return (
            <div className="mood-col" key={day.key}>
              <motion.div
                className="mood-dot"
                data-empty={!entry}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.025, type: "spring", stiffness: 400, damping: 26 }}
                title={entry ? `${day.key}: ${entry.mood}` : `${day.key}: nothing logged`}
              >
                {entry?.emoji ?? ""}
              </motion.div>
              <span className="mood-day">{day.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mood-summary">
        {log.length === 0
          ? "no moods logged yet — tap one above 💕"
          : topMood
            ? `${log.length} logged · mostly ${topMood.mood} ${
                MOODS.find((m) => m.mood === topMood.mood)?.emoji ?? ""
              }`
            : `${log.length} logged`}
      </div>
    </div>
  );
}
