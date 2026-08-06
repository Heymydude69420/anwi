import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { pickForToday } from "../lib/daily";
import { monthsTogether } from "../lib/dates";

const LINES = [
  "hi Anwi — i made this whole thing for you",
  "still my favourite person, every single day",
  "i think about you more than you'd believe",
  "you're the best part of all of this",
  "made with my whole heart, just for you",
  "somehow you keep putting up with me",
];

/**
 * Timing for one character.
 *
 * Even spacing reads as a typewriter, not a hand. Real writing slows at word
 * boundaries and pauses harder at punctuation, so the delay varies per glyph
 * with a little jitter on top.
 */
function delayFor(char: string): number {
  if (char === " ") return 105;
  if (",.—!?".includes(char)) return 190;
  return 42 + Math.random() * 38;
}

/**
 * Played once per page load, not once per visit.
 *
 * A module-scope flag rather than component state: the home view unmounts every
 * time she opens another tab, and replaying the intro on each return would be
 * the same mistake the confetti burst made.
 */
let hasPlayed = false;

export function CinematicHero() {
  const line = pickForToday(LINES, "intro") ?? LINES[0];
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Captured once at first render. Reading `hasPlayed` directly during render
  // would flip this to true the moment the effect below sets it, changing the
  // effect's dependencies mid-animation and tearing down the pending timer.
  const [skip] = useState(() => hasPlayed || reduced);
  const [revealed, setRevealed] = useState(skip ? line.length : 0);
  const [writing, setWriting] = useState(!skip);
  const timer = useRef<number>(0);

  useEffect(() => {
    if (skip) return;
    hasPlayed = true;

    let index = 0;

    const writeNext = () => {
      index += 1;
      setRevealed(index);

      if (index < line.length) {
        timer.current = window.setTimeout(writeNext, delayFor(line[index]));
      }
      // Reaching the end is picked up by the handover effect below, which
      // watches `revealed` rather than chaining off this timer.
    };

    timer.current = window.setTimeout(writeNext, 500);
    return () => {
      window.clearTimeout(timer.current);
    };
  }, [line, skip]);

  // Handing over is its own effect keyed on progress, rather than a timeout
  // chained inside the write loop — that shared the ref the cleanup clears,
  // so a teardown at the wrong moment could swallow the handover entirely.
  useEffect(() => {
    if (skip || revealed < line.length) return;
    const id = window.setTimeout(() => setWriting(false), 900);
    return () => window.clearTimeout(id);
  }, [revealed, line.length, skip]);

  return (
    <div className="cine">
      <AnimatePresence mode="wait">
        {writing ? (
          <motion.div
            key="writing"
            className="cine-stage"
            // Opacity and offset only. `mode="wait"` holds the incoming child
            // until this exit resolves, and animating `filter` from no declared
            // initial filter can leave that promise pending forever — which
            // strands the intro on screen and the hero never mounts.
            exit={{ opacity: 0, y: -12, transition: { duration: 0.45 } }}
          >
            <p className="cine-hand">
              <span>{line.slice(0, revealed)}</span>
              <motion.span
                className="cine-nib"
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 0.75, repeat: Infinity }}
              />
            </p>
          </motion.div>
        ) : (
          <motion.header
            key="hero"
            className="hero"
            initial={skip ? false : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 190, damping: 24 }}
          >
            <Stagger delay={skip ? 0 : 0.05}>
              <motion.div
                style={{ fontSize: "2.4rem", marginBottom: ".4rem" }}
                animate={{ scale: [1, 1.16, 1, 1.1, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                💚
              </motion.div>
            </Stagger>

            <Stagger delay={skip ? 0 : 0.14}>
              <div className="hero-eyebrow">{monthsTogether()} months of us ✨</div>
            </Stagger>

            <Stagger delay={skip ? 0 : 0.22}>
              <h1>
                Anwi's
                <br />
                <em>Little Corner</em> 🌸
              </h1>
            </Stagger>

            <Stagger delay={skip ? 0 : 0.34}>
              <p>Made with love by Ayush 💕</p>
            </Stagger>
          </motion.header>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stagger({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
