import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { KEYS } from "../lib/storage";
import { usePersisted } from "../lib/usePersisted";
import { useToast } from "./Toast";

export interface Memory {
  id: string;
  text: string;
  at: number;
}

export function MemoryJar() {
  const [memories, setMemories, ready] = usePersisted<Memory[]>(KEYS.memories, []);
  const [draft, setDraft] = useState("");
  const toast = useToast();

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    setMemories((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, at: Date.now() },
    ]);
    setDraft("");
    toast("memory saved in the jar 🫙");
  };

  const remove = (id: string) =>
    setMemories((current) => current.filter((memory) => memory.id !== id));

  if (!ready) return <div className="card card-full" style={{ minHeight: 200 }} />;

  return (
    <div className="card card-full">
      <div className="card-title">🫙 Memory Jar</div>
      {/* The old copy said "later in this visit" because nothing was stored.
          It genuinely keeps them now. */}
      <p className="card-sub">
        Drop a little memory in here — it stays in the jar for good 💚
      </p>

      <div className="add-row" style={{ marginBottom: ".9rem" }}>
        <input
          className="field"
          value={draft}
          maxLength={200}
          placeholder="Type a memory you want to keep..."
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && save()}
        />
        <button className="add-btn" onClick={save}>
          Save
        </button>
      </div>

      <div className="list">
        <AnimatePresence initial={false} mode="popLayout">
          {memories.length === 0 && (
            <motion.div key="empty" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              No memories in the jar yet. Add one 💕
            </motion.div>
          )}

          {/* Newest first, without mutating the stored order. */}
          {[...memories].reverse().map((memory) => (
            <motion.div
              key={memory.id}
              className="memory"
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            >
              <div className="memory-meta">
                {new Date(memory.at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                <button
                  className="item-del"
                  onClick={() => remove(memory.id)}
                  aria-label="Delete memory"
                >
                  ✕
                </button>
              </div>
              <div className="memory-text">{memory.text}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
