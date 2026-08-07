import { motion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
/** Higher winds the arms closer together. */
const TURNS = 13;

const MIN_SCALE = 1;
const MAX_SCALE = 2;

/**
 * Archimedean spiral, parameterised so consecutive days sit a constant distance
 * apart along the arm.
 *
 * A golden-angle layout spreads points more evenly but puts each day ~137° from
 * the last, which makes the sequence impossible to follow. Taking both angle and
 * radius from sqrt(i) keeps day N+1 beside day N.
 */
function spiralPoint(i: number, total: number) {
  const t = Math.sqrt(i / Math.max(1, total));
  const angle = 2 * Math.PI * TURNS * t - Math.PI / 2;
  const radius = MAX_RADIUS * t;
  return { x: CENTRE + Math.cos(angle) * radius, y: CENTRE + Math.sin(angle) * radius };
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

  // The anniversary itself is day one, so the run is inclusive of both ends:
  // day 1 is 5 October 2024 and the final star is today. `total` counts days
  // *elapsed*, which is one fewer than the number of days on the map.
  const stars: Star[] = [];
  for (let i = 0; i <= total; i++) {
    const day = i + 1;
    const date = new Date(ANNIVERSARY);
    date.setDate(date.getDate() + i);
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

interface View {
  scale: number;
  x: number;
  y: number;
}

/**
 * Keep the spiral reachable but not losable.
 *
 * Panning was unbounded, so it could be flung arbitrarily far off screen with
 * no way back except the reset button. The translation is clamped to the range
 * that can bring any point of the spiral — and nothing beyond it — to the
 * middle of the frame.
 */
function clampView(v: View): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
  const near = (CENTRE - MAX_RADIUS) * scale;
  const far = (CENTRE + MAX_RADIUS) * scale;
  const lo = CENTRE - far;
  const hi = CENTRE - near;
  return {
    scale,
    x: Math.min(hi, Math.max(lo, v.x)),
    y: Math.min(hi, Math.max(lo, v.y)),
  };
}

/**
 * The stars, rendered once.
 *
 * Kept apart from the view state and memoised so panning and zooming never
 * reconcile 670 SVG nodes. Zoom is applied by the transform on the wrapping
 * <g>, which the browser composites on its own — previously each dot's radius
 * was recomputed per frame to hold a fixed on-screen size, and that re-render
 * was what made dragging stutter.
 */
const StarLayer = memo(function StarLayer({
  stars,
  revealed,
  todayDay,
  onPick,
}: {
  stars: Star[];
  revealed: number;
  todayDay: number;
  onPick: (s: Star) => void;
}) {
  return (
    <>
      {stars.slice(0, revealed).map((star) => {
        const marked = Boolean(star.memory || star.mood);
        return (
          <circle
            key={star.day}
            cx={star.x}
            cy={star.y}
            r={star.milestone ? 1.45 : marked ? 1.15 : 0.62}
            className="constellation-star"
            data-milestone={star.milestone}
            data-marked={marked}
            data-today={star.day === todayDay}
            onMouseEnter={() => onPick(star)}
            onClick={() => onPick(star)}
          />
        );
      })}
    </>
  );
});

export function Constellation() {
  const [memories] = usePersisted<Memory[]>(KEYS.memories, []);
  const [moods] = usePersisted<MoodEntry[]>(KEYS.moodLog, []);
  const [active, setActive] = useState<Star | null>(null);
  const [revealed, setRevealed] = useState(0);

  const total = daysTogether();
  const stars = useMemo(() => buildStars(total, memories, moods), [total, memories, moods]);
  // Days on the map is one more than days elapsed, since day one is the
  // anniversary itself and today is also drawn.
  const count = stars.length;
  const todayDay = count;

  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const view = useRef<View>({ scale: 1, x: 0, y: 0 });
  const [zoomLabel, setZoomLabel] = useState(1);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min((now - start) / 2000, 1);
      setRevealed(Math.ceil(count * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [count]);

  /**
   * Write the transform straight to the DOM.
   *
   * Going through React state here would re-render on every pointer move; the
   * transform is a single attribute, so setting it directly keeps dragging on
   * the compositor. The zoom readout is the only piece that needs state, and it
   * updates at a coarser rate.
   */
  const applyView = useCallback((next: View) => {
    const v = clampView(next);
    view.current = v;
    groupRef.current?.setAttribute("transform", `translate(${v.x} ${v.y}) scale(${v.scale})`);
    setZoomLabel((prev) => (Math.abs(prev - v.scale) > 0.05 ? v.scale : prev));
  }, []);

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: CENTRE, y: CENTRE };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  /** Zoom about a point, keeping whatever is under it fixed. */
  const zoomAt = useCallback(
    (factor: number, fx: number, fy: number) => {
      const v = view.current;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      if (scale === v.scale) return;
      const k = scale / v.scale;
      applyView({ scale, x: fx - (fx - v.x) * k, y: fy - (fy - v.y) * k });
    },
    [applyView],
  );

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const local = toLocal(event.clientX, event.clientY);
      zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, local.x, local.y);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [toLocal, zoomAt]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);
  const dragged = useRef(false);
  const pending = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);

  /**
   * Coalesce pointer moves to one write per frame.
   *
   * Deltas accumulate rather than each move computing an absolute position from
   * `view.current` — that only updates when the frame flushes, so two moves in
   * one frame would both derive from the same stale origin and the first would
   * be silently dropped.
   */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      pending.current.x += dx;
      pending.current.y += dy;
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = 0;
        const v = view.current;
        applyView({ scale: v.scale, x: v.x + pending.current.x, y: v.y + pending.current.y });
        pending.current = { x: 0, y: 0 };
      });
    },
    [applyView],
  );

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
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
    panBy(dx, dy);
  };

  const endPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDist.current = 0;
  };

  const pick = useCallback((star: Star) => {
    if (!dragged.current) setActive(star);
  }, []);

  const reset = () => applyView({ scale: 1, x: 0, y: 0 });

  const today = stars[stars.length - 1];

  const focusToday = () => {
    if (!today) return;
    const scale = MAX_SCALE;
    applyView({ scale, x: CENTRE - today.x * scale, y: CENTRE - today.y * scale });
    setActive(today);
  };

  const thread = useMemo(() => {
    if (revealed < 2) return "";
    return stars
      .slice(0, revealed)
      .map((s, i) => `${i === 0 ? "M" : "L"}${s.x.toFixed(2)} ${s.y.toFixed(2)}`)
      .join(" ");
  }, [stars, revealed]);

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
      >
        <g ref={groupRef} transform="translate(0 0) scale(1)">
          {/* non-scaling-stroke keeps the thread one hairline wide at any zoom
              without recomputing it per frame. */}
          <path
            d={thread}
            className="constellation-thread"
            strokeWidth={0.32}
            vectorEffect="non-scaling-stroke"
          />
          <StarLayer stars={stars} revealed={revealed} todayDay={todayDay} onPick={pick} />
          {today && revealed >= stars.length && (
            <circle cx={today.x} cy={today.y} r={2.4} className="constellation-today" />
          )}
        </g>
      </svg>

      <div className="constellation-controls">
        <button onClick={() => zoomAt(1.45, CENTRE, CENTRE)} aria-label="Zoom in">
          ＋
        </button>
        <button onClick={() => zoomAt(1 / 1.45, CENTRE, CENTRE)} aria-label="Zoom out">
          －
        </button>
        <button onClick={reset} aria-label="Reset view">
          ⤢
        </button>
        <button onClick={focusToday} aria-label="Jump to today">
          today
        </button>
      </div>

      <div className="constellation-zoom">{zoomLabel.toFixed(1)}×</div>

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
              {active.day === todayDay && " — today"}
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
