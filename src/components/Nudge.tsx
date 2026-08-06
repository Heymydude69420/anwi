import { useEffect, useRef, useState } from "react";
import { confetti } from "../lib/confetti";
import { publish } from "../lib/ntfy";

const COOLDOWN_MS = 20_000;

const QUICK = [
  { label: "💚 Thinking of you", body: "Anwi is thinking of you right now 🥹💚" },
  { label: "🥺 I miss you", body: "i miss youuu come here" },
  { label: "🤗 Big hug", body: "sending you the biggest hug rn" },
  { label: "📞 Call me", body: "call me when youre free cutie" },
];

export function Nudge() {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [custom, setCustom] = useState("");
  const cooldownUntil = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, []);

  const clearLater = (ms: number) => {
    timers.current.push(window.setTimeout(() => setStatus(""), ms));
  };

  const send = async (message: string, title = "💚 from Anwi") => {
    const now = Date.now();
    if (now < cooldownUntil.current) {
      setStatus(`hold on! wait ${Math.ceil((cooldownUntil.current - now) / 1000)}s 😅`);
      clearLater(2500);
      return false;
    }

    setSending(true);
    setStatus("sending your nudge... 💌");

    const ok = await publish(message, title);
    setSending(false);

    if (ok) {
      // Only start the cooldown on a real success, so a failed send doesn't
      // lock her out for 20 seconds with nothing delivered.
      cooldownUntil.current = Date.now() + COOLDOWN_MS;
      setStatus("nudge sent! he'll see it soon 🥹💚");
      confetti(window.innerWidth / 2, window.innerHeight / 2);
    } else {
      setStatus("couldn't send that — check your connection 😕");
    }

    clearLater(5000);
    return ok;
  };

  const sendCustom = async () => {
    const message = custom.trim();
    if (!message) {
      setStatus("write a message first 💌");
      clearLater(2500);
      return;
    }
    if (await send(message)) setCustom("");
  };

  return (
    <>
      <div className="card-title">💌 Send a Nudge</div>
      <p className="card-sub">Miss Ayush? Tap a button and he'll get a little notification 🥹</p>

      <div className="pill-grid">
        {QUICK.map((quick) => (
          <button
            key={quick.label}
            className="btn btn-ghost"
            disabled={sending}
            onClick={() => send(quick.body)}
          >
            {quick.label}
          </button>
        ))}
      </div>

      <input
        className="field"
        style={{ marginBottom: ".6rem" }}
        value={custom}
        maxLength={120}
        placeholder="Write your own little message..."
        onChange={(event) => setCustom(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && sendCustom()}
      />

      <button className="btn btn-green" onClick={sendCustom} disabled={sending}>
        💌 Send Custom Nudge
      </button>

      <div className="nudge-status">{status}</div>
    </>
  );
}
