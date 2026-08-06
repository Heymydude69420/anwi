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

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const shake = useAnimationControls();

  const submit = () => {
    if (value === PASSWORD) {
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
          🔒
        </motion.span>

        <h1>Psst… it's locked 💚</h1>
        <p>
          This is a special place just for you.
          <br />
          Enter the secret password to get in 🥹
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
          Open Sesame 💕
        </button>

        <div className="lock-error">{error}</div>
      </motion.div>
    </div>
  );
}
