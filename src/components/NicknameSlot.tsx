import { useEffect, useMemo, useRef, useState } from "react";
import { confetti } from "../lib/confetti";
import { pickForToday } from "../lib/daily";
import { useContent } from "../lib/useContent";

const ITEM_H = 40;
const WINDOW_H = 80;
/** Centres the landed row in the window instead of hanging it off the top. */
const CENTER_OFFSET = (WINDOW_H - ITEM_H) / 2;
const REPEATS = 30;

export function NicknameSlot() {
  const { content, ready } = useContent();
  const nicknames = content.nicknames;

  const reel = useRef<HTMLDivElement>(null);
  const index = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Reel geometry follows however many nicknames are configured, so adding one
  // in the admin panel doesn't leave the strip mis-measured.
  const middle = useMemo(
    () => Math.floor(REPEATS / 2) * Math.max(1, nicknames.length),
    [nicknames.length],
  );

  const translateFor = (i: number) => `translateY(-${i * ITEM_H - CENTER_OFFSET}px)`;

  useEffect(() => {
    const node = reel.current;
    if (!node || !ready) return;
    index.current = middle;
    node.style.transition = "none";
    node.style.transform = translateFor(middle);
  }, [ready, middle]);

  const spin = () => {
    const node = reel.current;
    if (!node || spinning || nicknames.length === 0) return;

    setSpinning(true);
    setResult(null);

    const chosen = Math.floor(Math.random() * nicknames.length);
    const loops = nicknames.length * (6 + Math.floor(Math.random() * 3));
    const delta =
      (chosen - (index.current % nicknames.length) + nicknames.length) % nicknames.length;
    const target = index.current + loops + delta;

    // Two frames: the first commits the starting position with no transition,
    // the second applies the animated transform. Collapsing them into one frame
    // makes the browser skip the transition entirely.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        node.style.transition = "transform 2.3s cubic-bezier(0.13, 0.78, 0.16, 1)";
        node.style.transform = translateFor(target);
      });
    });

    const settle = () => {
      // Snap back to the middle of the strip so repeated spins can never run
      // off the end of the rendered list and leave the window blank.
      const reset = middle + (target % nicknames.length);
      node.style.transition = "none";
      node.style.transform = translateFor(reset);
      index.current = reset;

      setSpinning(false);
      setResult(nicknames[chosen]);
      confetti(window.innerWidth / 2, window.innerHeight / 2.6);
    };

    node.addEventListener("transitionend", settle, { once: true });
  };

  const suggestion = pickForToday(nicknames, "nickname");

  return (
    <div className="card card-full" style={{ marginBottom: "1.1rem" }}>
      <div className="card-title">🎰 Today's Nickname</div>

      <div className="slot">
        <div className="slot-window" style={{ height: WINDOW_H }}>
          <div className="slot-band" style={{ height: ITEM_H }} />
          <div className="slot-reel" ref={reel}>
            {Array.from({ length: REPEATS }).flatMap((_, r) =>
              nicknames.map((name) => (
                <div className="slot-item" key={`${r}-${name}`} style={{ height: ITEM_H }}>
                  {name}
                </div>
              )),
            )}
          </div>
        </div>

        <button className="btn btn-primary slot-btn" onClick={spin} disabled={spinning || !ready}>
          {spinning ? "🎰 spinning…" : result ? "✨ Pull again!" : "✨ Pull!"}
        </button>

        <div className="slot-result" data-show={result !== null}>
          {result ? `Today you're my ${result} 💚` : " "}
        </div>

        {!result && suggestion && (
          <div className="slot-hint">the stars say “{suggestion}” today ✨</div>
        )}
      </div>
    </div>
  );
}
