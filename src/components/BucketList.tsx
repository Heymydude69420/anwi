import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { confetti } from "../lib/confetti";
import { KEYS } from "../lib/storage";
import { usePersisted } from "../lib/usePersisted";
import { useToast } from "./Toast";

export interface BucketItem {
  id: string;
  text: string;
  done: boolean;
  addedAt: number;
}

type Lists = Record<string, BucketItem[]>;

const TABS = [
  { key: "dates", label: "🌙 Date Ideas" },
  { key: "places", label: "✈️ Places to Visit" },
  { key: "things", label: "⭐ Things to Do" },
] as const;

const seed = (text: string): BucketItem => ({
  id: `${text}-${Math.random().toString(36).slice(2, 8)}`,
  text,
  done: false,
  addedAt: Date.now(),
});

const DEFAULTS: Lists = {
  dates: [
    "Picnic at sunset 🌅",
    "Cook a new recipe together 👨‍🍳",
    "Movie marathon with blankets 🎬",
    "Drive somewhere random 🚗",
    "Stargazing night 🌟",
  ].map(seed),
  places: ["Blue Ridge Parkway 🏔️", "Washington D.C. 🏛️", "Beach trip 🏖️"].map(seed),
  things: [
    "Take a cheesy photo booth pic 📸",
    "Write letters to open in 5 years 💌",
    "Pull an all-nighter together ⭐",
    "Learn a TikTok dance 💃",
  ].map(seed),
};

export function BucketList() {
  const [lists, setLists, ready] = usePersisted<Lists>(KEYS.lists, DEFAULTS);
  const [tab, setTab] = useState<string>(TABS[0].key);
  const [draft, setDraft] = useState("");
  const toast = useToast();

  const items = lists[tab] ?? [];
  const doneCount = items.filter((item) => item.done).length;

  const mutate = (next: (current: BucketItem[]) => BucketItem[]) =>
    setLists((current) => ({ ...current, [tab]: next(current[tab] ?? []) }));

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    mutate((current) => [...current, seed(text)]);
    setDraft("");
    toast("Added to the list 💚");
  };

  const toggle = (id: string, event: React.MouseEvent) => {
    let turningOn = false;
    mutate((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        turningOn = !item.done;
        return { ...item, done: !item.done };
      }),
    );
    if (turningOn) confetti(event.clientX, event.clientY);
  };

  const remove = (id: string) => mutate((current) => current.filter((i) => i.id !== id));

  // Holding the render back until the stored value arrives stops the seed list
  // flashing over her real data on every load.
  if (!ready) return <div className="card card-full" style={{ minHeight: 260 }} />;

  return (
    <div className="card card-full" style={{ marginBottom: "1.1rem" }}>
      <div className="card-title">💝 Our Bucket List</div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className="tab"
            data-active={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="list">
        <AnimatePresence initial={false} mode="popLayout">
          {items.length === 0 && (
            <motion.div
              key="empty"
              className="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Nothing here yet — add something! 💕
            </motion.div>
          )}

          {items.map((item) => (
            <motion.div
              key={item.id}
              className="item"
              data-done={item.done}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -24, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            >
              <button
                className="check"
                onClick={(event) => toggle(item.id, event)}
                aria-label={item.done ? "Mark as not done" : "Mark as done"}
                aria-pressed={item.done}
              >
                ✓
              </button>
              {/* Rendered as a text node, so a "<" in her text can no longer
                  break or swallow the row the way innerHTML did. */}
              <span className="item-text">{item.text}</span>
              <button
                className="item-del"
                onClick={() => remove(item.id)}
                aria-label={`Delete ${item.text}`}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="add-row">
        <input
          className="field"
          value={draft}
          maxLength={90}
          placeholder="Add something new..."
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && add()}
        />
        <button className="add-btn" onClick={add}>
          + Add
        </button>
      </div>

      <div className="progress">
        {items.length === 0
          ? ""
          : doneCount === items.length
            ? "🎉 All done! Time to add more!"
            : `${doneCount}/${items.length} done`}
      </div>
    </div>
  );
}
