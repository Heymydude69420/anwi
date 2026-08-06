import { useRef } from "react";
import { KEYS } from "../lib/storage";
import { usePersisted } from "../lib/usePersisted";
import { useToast } from "./Toast";

const BURST = ["💨", "🌬️", "☁️", "💀", "😂"];

/**
 * One AudioContext for the life of the page.
 *
 * The original created a fresh context on every click and never closed it.
 * Browsers cap concurrent contexts at around six, so the sound died after a
 * handful of taps — on a button whose entire purpose is being spammed.
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  try {
    const Ctor = window.AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new Ctor();
    return audioContext;
  } catch {
    return null;
  }
}

function parp() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Safari suspends the context until a user gesture resumes it.
  if (ctx.state === "suspended") void ctx.resume();

  const rate = ctx.sampleRate;
  const duration = 0.6 + Math.random() * 0.5;
  const buffer = ctx.createBuffer(1, Math.floor(rate * duration), rate);
  const data = buffer.getChannelData(0);

  // Layered: a low rumble, a sputtering flutter, and a little wetness.
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    const env = Math.exp(-t * 3.5) * (1 + 0.6 * Math.sin(2 * Math.PI * t * 14 + Math.sin(2 * Math.PI * t * 7)));
    const rumble = Math.sin(2 * Math.PI * (55 + 20 * Math.sin(2 * Math.PI * t * 2.5)) * t);
    const flutter = (Math.random() * 2 - 1) * Math.pow(Math.max(0, 1 - t / duration), 0.4);
    const wet = (Math.random() * 2 - 1) * 0.15;
    data[i] = env * (rumble * 0.55 + flutter * 0.35 + wet) * 0.55;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.value = 0.7;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 600;
  lowpass.Q.value = 1.2;

  source.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  source.onended = () => source.disconnect();
}

export function TootButton() {
  const [count, setCount] = usePersisted<number>(KEYS.tootCount, 0);
  const toast = useToast();
  const host = useRef<HTMLDivElement>(null);

  const toot = (event: React.MouseEvent) => {
    setCount((current) => current + 1);
    parp();

    for (let i = 0; i < 3; i++) {
      const puff = document.createElement("span");
      puff.textContent = BURST[(Math.random() * BURST.length) | 0];
      Object.assign(puff.style, {
        position: "fixed",
        left: `${event.clientX + Math.random() * 56 - 28}px`,
        top: `${event.clientY}px`,
        fontSize: "1.7rem",
        pointerEvents: "none",
        zIndex: "250",
      } satisfies Partial<CSSStyleDeclaration>);

      document.body.appendChild(puff);
      puff
        .animate(
          [
            { transform: "translate(-50%, -50%) scale(.5)", opacity: 1 },
            { transform: "translate(-50%, -170%) scale(1.3)", opacity: 1, offset: 0.6 },
            { transform: "translate(-50%, -280%) scale(.8)", opacity: 0 },
          ],
          { duration: 1000, delay: i * 90, fill: "forwards", easing: "ease-out" },
        )
        .finished.catch(() => {})
        .finally(() => puff.remove());
    }

    toast("💨 toot toot 💀");
  };

  return (
    <div className="toot" ref={host}>
      <div className="toot-title">💨 The Button</div>
      <p className="card-sub" style={{ marginBottom: ".7rem" }}>
        you know what this does 💀
      </p>
      <button className="toot-btn" onClick={toot}>
        🍑 toot toot
      </button>
      <div className="toot-count">toots released: {count.toLocaleString()}</div>
    </div>
  );
}
