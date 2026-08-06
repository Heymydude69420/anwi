import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ANNIVERSARY, daysTogether } from "../lib/dates";
import { todayKey } from "../lib/daily";
import type { MoodEntry } from "./MoodHistory";
import type { Memory } from "./MemoryJar";
import { KEYS } from "../lib/storage";
import { usePersisted } from "../lib/usePersisted";

interface Star {
  index: number;
  date: Date;
  x: number;
  y: number;
  radius: number;
  milestone: boolean;
  memory?: string;
  mood?: string;
}

const MILESTONES = new Set([1, 100, 200, 300, 365, 500, 690, 730, 1000, 1095, 1111, 1234, 1500, 2000]);

/**
 * Every day together, drawn as one point of light.
 *
 * Laid out on a golden-angle spiral (the phyllotaxis pattern sunflowers use),
 * which distributes any number of points evenly without clumping or leaving
 * gaps at the edges — so it stays balanced as it grows by one star a day.
 */
function buildStars(total: number, memories: Memory[], moods: MoodEntry[]): Star[] {
  const byDay = new Map<string, { memory?: string; mood?: string }>();

  for (const memory of memories) {
    const key = todayKey(new Date(memory.at));
    byDay.set(key, { ...byDay.get(key), memory: memory.text });
  }
  for (const entry of moods) {
    const key = todayKey(new Date(entry.at));
    byDay.set(key, { ...byDay.get(key), mood: entry.emoji });
  }

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const stars: Star[] = [];

  for (let i = 0; i < total; i++) {
    const day = i + 1;
    const date = new Date(ANNIVERSARY);
    date.setDate(date.getDate() + i);

    const marked = byDay.get(todayKey(date));
    const angle = i * GOLDEN;
    // sqrt keeps the areal density even rather than crowding the centre.
    const distance = Math.sqrt(i / Math.max(1, total - 1));

    stars.push({
      index: day,
      date,
      x: 50 + Math.cos(angle) * distance * 46,
      y: 50 + Math.sin(angle) * distance * 46,
      radius: MILESTONES.has(day) ? 3.4 : marked ? 2.2 : 1.1,
      milestone: MILESTONES.has(day),
      memory: marked?.memory,
      mood: marked?.mood,
    });
  }

  return stars;
}

export function Constellation() {
  const [memories] = usePersisted<Memory[]>(KEYS.memories, []);
  const [moods] = usePersisted<MoodEntry[]>(KEYS.moodLog, []);
  const [hovered, setHovered] = useState<Star | null>(null);
  const [revealed, setRevealed] = useState(0);
  const total = daysTogether();

  const stars = useMemo(() => buildStars(total, memories, moods), [total, memories, moods]);

  // Draw the stars on over a couple of seconds instead of snapping them in.
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 2200;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setRevealed(Math.floor(total * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [total]);

  const marked = stars.filter((s) => s.memory || s.mood).length;

  return (
    <div className="constellation">
      <svg viewBox="0 0 100 100" className="constellation-sky" role="img" aria-label={`${total} days together`}>
        <defs>
          <radialGradient id="starGlow">
            <stop offset="0%" stopColor="var(--red-light)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--red-light)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Threads between milestones, drawn behind the stars. */}
        {stars
          .filter((s) => s.milestone && s.index <= revealed)
          .map((star, i, list) => {
            const next = list[i + 1];
            if (!next) return null;
            return (
              <line
                key={`link-${star.index}`}
                x1={star.x}
                y1={star.y}
                x2={next.x}
                y2={next.y}
                className="constellation-link"
              />
            );
          })}

        {stars.slice(0, revealed).map((star) => (
          <g key={star.index}>
            {star.milestone && <circle cx={star.x} cy={star.y} r={star.radius * 2.6} fill="url(#starGlow)" />}
            <circle
              cx={star.x}
              cy={star.y}
              r={star.radius}
              className="constellation-star"
              data-milestone={star.milestone}
              data-marked={Boolean(star.memory || star.mood)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setHovered(star)}
            />
          </g>
        ))}
      </svg>

      <motion.div
        className="constellation-readout"
        key={hovered?.index ?? "idle"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {hovered ? (
          <>
            <strong>
              Day {hovered.index.toLocaleString()}
              {hovered.milestone && " ✨"}
            </strong>
            <span>
              {hovered.date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {hovered.mood && <span>felt {hovered.mood}</span>}
            {hovered.memory && <em>“{hovered.memory}”</em>}
          </>
        ) : (
          <>
            <strong>{total.toLocaleString()} days</strong>
            <span>one star for each — {marked} of them remembered</span>
            <em>touch a star 💫</em>
          </>
        )}
      </motion.div>
    </div>
  );
}
