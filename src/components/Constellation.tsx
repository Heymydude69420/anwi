import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { todayKey } from "../lib/daily";
import { ANNIVERSARY, daysTogether } from "../lib/dates";
import { KEYS } from "../lib/storage";
import { usePersisted } from "../lib/usePersisted";
import type { Memory } from "./MemoryJar";
import type { MoodEntry } from "./MoodHistory";

interface Star {
  day: number;
  date: Date;
  x: number;
  y: number;
  milestone: boolean;
  memory?: string;
  mood?: string;
}

const MILESTONES = new Set([
  1, 100, 200, 300, 365, 500, 690, 730, 1000, 1095, 1111, 1234, 1500, 2000, 2555, 3000,
]);

const CENTRE = 50;
const MAX_RADIUS = 44;
const TURNS = 7;

/**
 * Archimedean spiral, parameterised so consecutive days sit a constant distance
 * apart along the arm.
 *
 * The previous layout used the golden angle, which spreads points beautifully
 * but puts each day ~137° from the last — so the sequence is impossible to
 * follow by eye. Taking both angle and radius from sqrt(i) instead keeps the
 * spacing even *and* keeps day N+1 right next to day N, which is the whole
 * point of watching it grow.
 */
function spiralPoint(i: number, total: number) {
  const t = Math.sqrt(i / Math.max(1, total));
  const angle = 2 * Math.PI * TURNS * t - Math.PI / 2;
  const radius = MAX_RADIUS * t;
  return {
    x: CENTRE + Math.cos(angle) * radius,
    y: CENTRE + Math.sin(angle) * radius,
  };
}

function buildStars(total: number, memories: Memory[], moods: MoodEntry[]): Star[] {
  const marks = new Map<string, { memory?: string; mood?: string }>();
  for (const m of memories) {
    const key = todayKey(new Date(m.at));
    marks.set(key, { ...marks.get(key), memory: m.text });
  }
  for (const e of moods) {
    const key = todayKey(new Date(e.at));
    marks.set(key, { ...marks.get(key), mood: e.emoji });
  }

  const stars: Star[] = [];
  for (let i = 0; i < total; i++) {
    // "Day N" means N days together, so it falls on the anniversary plus N.
    // Offsetting by i instead put the final star a day behind the live count,
    // labelling today with yesterday's date.
    const day = i + 1;
    const date = new Date(ANNIVERSARY);
    date.setDate(date.getDate() + day);
    const mark = marks.get(todayKey(date));
    stars.push({
      day,
      date,
      ...spiralPoint(i, total),
      milestone: MILESTONES.has(day),
      memory: mark?.memory,
      mood: mark?.mood,
    });
  }
  return stars;
}

const MIN_SCALE = 1;
const MAX_SCALE = 14;

export function Constellation() {
  const [memories] = usePersisted<Memory[]>(KEYS.memories, []);
  const [moods] = usePersisted<MoodEntry[]>(KEYS.moodLog, []);
  const [active, setActive] = useState<Star | null>(null);
  const [revealed, setRevealed] = useState(0);

  const total = daysTogether();
  const stars = useMemo(() => buildStars(total, memories, moods), [total, memories, moods]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });

  // Draw the spiral on over a couple of seconds.
  useEffect(() => {
    const start = performance.now();
    const duration = 2000;
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setRevealed(Math.floor(total * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [total]);

  /** Pointer position in viewBox units. */
  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: CENTRE, y: CENTRE };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  /**
   * Zoom about a fixed point.
   *
   * The world coordinate under the cursor has to stay under the cursor, so the
   * translation is re-derived from the new scale rather than left alone —
   * otherwise zooming drifts away from whatever you aimed at.
   */
  const zoomAt = useCallback((factor: number, focusX: number, focusY: number) => {
    setView((v) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      if (scale === v.scale) return v;
      const k = scale / v.scale;
      return {
        scale,
        x: focusX - (focusX - v.x) * k,
        y: focusY - (focusY - v.y) * k,
      };
    });
  }, []);

  // Non-passive wheel listener, since preventDefault is needed to stop the
  // page scrolling while zooming.
  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const local = toLocal(event.clientX, event.clientY);
      zoomAt(event.deltaY < 0 ? 1.14 : 1 / 1.14, local.x, local.y);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [toLocal, zoomAt]);

  // Pan with one pointer, pinch with two.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);
  const dragged = useRef(false);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, toLocal(event.clientX, event.clientY));
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const next = toLocal(event.clientX, event.clientY);
    const prev = pointers.current.get(event.pointerId)!;
    pointers.current.set(event.pointerId, next);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current > 0) {
        zoomAt(dist / pinchDist.current, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      pinchDist.current = dist;
      dragged.current = true;
      return;
    }

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) dragged.current = true;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const endPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDist.current = 0;
  };

  const reset = () => setView({ scale: 1, x: 0, y: 0 });

  /** Centre the view on a day and zoom in enough to read its neighbours. */
  const focusOn = useCallback((star: Star, scale = 6) => {
    setView({ scale, x: CENTRE - star.x * scale, y: CENTRE - star.y * scale });
    setActive(star);
  }, []);

  const today = stars[stars.length - 1];

  // One path through every day — the thread that makes the order legible.
  const thread = useMemo(() => {
    if (revealed < 2) return "";
    return stars
      .slice(0, revealed)
      .map((s, i) => `${i === 0 ? "M" : "L"}${s.x.toFixed(2)} ${s.y.toFixed(2)}`)
      .join(" ");
  }, [stars, revealed]);

  // Counter-scale so dots and strokes keep a constant on-screen size as you zoom.
  const inv = 1 / view.scale;

  return (
    <div className="constellation">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="constellation-sky"
        role="img"
        aria-label={`${total} days together, drawn as a spiral`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
      >
        <defs>
          <radialGradient id="starGlow">
            <stop offset="0%" stopColor="var(--red-light)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--red-light)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <path d={thread} className="constellation-thread" strokeWidth={0.35 * inv} />

          {stars.slice(0, revealed).map((star) => {
            const marked = Boolean(star.memory || star.mood);
            const r = (star.milestone ? 1.5 : marked ? 1.15 : 0.62) * inv;
            return (
              <g key={star.day}>
                {star.milestone && (
                  <circle cx={star.x} cy={star.y} r={r * 3.4} fill="url(#starGlow)" />
                )}
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={r}
                  className="constellation-star"
                  data-milestone={star.milestone}
                  data-marked={marked}
                  data-today={star.day === total}
                  onMouseEnter={() => setActive(star)}
                  onClick={() => {
                    if (!dragged.current) setActive(star);
                  }}
                />
                {/* Labels only once zoomed far enough to have room for them. */}
                {view.scale > 5 && (star.milestone || marked) && (
                  <text
                    x={star.x}
                    y={star.y - r * 2.2}
                    className="constellation-label"
                    fontSize={2.4 * inv}
                  >
                    {star.mood ?? `day ${star.day}`}
                  </text>
                )}
              </g>
            );
          })}

          {today && revealed >= total && (
            <circle
              cx={today.x}
              cy={today.y}
              r={2.2 * inv}
              className="constellation-today"
              strokeWidth={0.4 * inv}
            />
          )}
        </g>
      </svg>

      <div className="constellation-controls">
        <button onClick={() => zoomAt(1.5, CENTRE, CENTRE)} aria-label="Zoom in">
          ＋
        </button>
        <button onClick={() => zoomAt(1 / 1.5, CENTRE, CENTRE)} aria-label="Zoom out">
          －
        </button>
        <button onClick={reset} aria-label="Reset view">
          ⤢
        </button>
        <button onClick={() => today && focusOn(today)} aria-label="Jump to today">
          today
        </button>
      </div>

      <div className="constellation-zoom">{view.scale.toFixed(1)}×</div>

      <motion.div
        className="constellation-readout"
        key={active?.day ?? "idle"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {active ? (
          <>
            <strong>
              Day {active.day.toLocaleString()}
              {active.milestone && " ✨"}
              {active.day === total && " — today"}
            </strong>
            <span>
              {active.date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {active.mood && <span>felt {active.mood}</span>}
            {active.memory && <em>“{active.memory}”</em>}
          </>
        ) : (
          <>
            <strong>{total.toLocaleString()} days</strong>
            <span>day one at the centre, today on the outer edge</span>
            <em>scroll or pinch to zoom · drag to move · tap a star 💫</em>
          </>
        )}
      </motion.div>
    </div>
  );
}
