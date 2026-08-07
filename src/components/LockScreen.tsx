import { motion, useAnimationControls } from "framer-motion";
import { useState } from "react";

/**
 * The gate.
 *
 * Worth being honest about what this is: the password ships in the client
 * bundle, so anyone who opens devtools can read it. On static hosting there is
 * no way around that. It keeps the page private from a casual passer-by, and
 * nothing behind it is sensitive.
 */
const PASSWORD = "pumpkin";

interface LockScreenProps {
  onUnlock: () => void;
  /** Defaults to her password; the admin page passes its own. */
  password?: string;
  title?: string;
  blurb?: string;
  emoji?: string;
  cta?: string;
}

export function LockScreen({
  onUnlock,
  password = PASSWORD,
  title = "Psst… it's locked 💚",
  blurb = "This is a special place just for you.\nEnter the secret password to get in 🥹",
  emoji = "🔒",
  cta = "Open Sesame 💕",
}: LockScreenProps) {
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const shake = useAnimationControls();

  const submit = () => {
    if (value === password) {
      onUnlock();
      return;
    }
    setError("nope! try again 💀");
    setValue("");
    shake.start({
      x: [0, -9, 9, -6, 6, 0],
      transition: { duration: 0.42 },
    });
    window.setTimeout(() => setError(""), 2500);
  };

  return (
    <div className="lock">
      <motion.div
        className="lock-card"
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <motion.span
          className="lock-emoji"
          animate={{ scale: [1, 1.18, 1, 1.12, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {emoji}
        </motion.span>

        <h1>{title}</h1>
        {/* Newlines in the blurb become line breaks. */}
        <p>
          {blurb.split("\n").map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {line}
            </span>
          ))}
        </p>

        <motion.div className="lock-field" animate={shake}>
          <input
            className="lock-input"
            type={reveal ? "text" : "password"}
            value={value}
            maxLength={30}
            autoComplete="off"
            placeholder="enter password..."
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
          <button
            className="lock-eye"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
          >
            {reveal ? "🙈" : "👁️"}
          </button>
        </motion.div>

        <button className="btn btn-primary" onClick={submit}>
          {cta}
        </button>

        <div className="lock-error">{error}</div>
      </motion.div>
    </div>
  );
}
