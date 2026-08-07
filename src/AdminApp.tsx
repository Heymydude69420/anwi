import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Countdowns } from "./components/Countdowns";
import { Hearts } from "./components/Hearts";
import { LockScreen } from "./components/LockScreen";
import { ToastProvider, useToast } from "./components/Toast";
import { daysTogether, monthsTogether, nextMilestone } from "./lib/dates";
import { publish } from "./lib/ntfy";
import { useContent, type SiteContent } from "./lib/useContent";
import { usePhotos } from "./lib/usePhotos";
import { useTimeOfDay } from "./lib/useTimeOfDay";

const ADMIN_PASSWORD = "ChittiBabu";

const QUICK_MESSAGES = [
  "hey sweetie pie, thinking of you 💚",
  "just wanted to say i love you",
  "hope your day is going okay 🥹",
  "text me when you get a sec 💕",
];

/**
 * Ayush's panel.
 *
 * Deliberately honest about what it can and cannot do. There is no server
 * behind this site, and localStorage is per-device, so nothing edited here can
 * reach her phone directly — the old panel claimed otherwise. Instead, edits
 * produce a new content.json to commit, which is the one channel both pages
 * genuinely share.
 */
function Panel() {
  const { content, ready } = useContent();
  const { photos } = usePhotos();
  const toast = useToast();

  const [draft, setDraft] = useState<SiteContent>({ nicknames: [], captions: {} });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (ready) setDraft({ nicknames: [...content.nicknames], captions: { ...content.captions } });
  }, [ready, content]);

  const edit = (next: SiteContent) => {
    setDraft(next);
    setDirty(true);
  };

  const days = daysTogether();
  const milestone = useMemo(() => nextMilestone(), []);

  // ---- nudges ----
  const [message, setMessage] = useState(QUICK_MESSAGES[0]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  const send = async () => {
    const body = message.trim();
    if (!body) {
      setStatus("write something first");
      return;
    }
    setSending(true);
    setStatus("sending…");
    const ok = await publish(body, "💚 from Ayush");
    setSending(false);
    // Reports what actually happened. The old panel showed "sent!" regardless.
    setStatus(ok ? "delivered to her phone 💚" : "failed — check your connection");
    window.setTimeout(() => setStatus(""), 5000);
  };

  // ---- nicknames ----
  const [newNickname, setNewNickname] = useState("");

  const addNickname = () => {
    const value = newNickname.trim();
    if (!value) return;
    if (draft.nicknames.includes(value)) {
      toast("already on the list");
      return;
    }
    edit({ ...draft, nicknames: [...draft.nicknames, value] });
    setNewNickname("");
  };

  const removeNickname = (name: string) =>
    edit({ ...draft, nicknames: draft.nicknames.filter((n) => n !== name) });

  const move = (from: number, by: number) => {
    const to = from + by;
    if (to < 0 || to >= draft.nicknames.length) return;
    const next = [...draft.nicknames];
    [next[from], next[to]] = [next[to], next[from]];
    edit({ ...draft, nicknames: next });
  };

  // ---- captions ----
  const [selected, setSelected] = useState<string | null>(null);
  const captioned = Object.values(draft.captions).filter(Boolean).length;

  const setCaption = (id: string, text: string) =>
    edit({ ...draft, captions: { ...draft.captions, [id]: text } });

  // ---- publishing ----
  const download = () => {
    const clean: SiteContent = {
      nicknames: draft.nicknames,
      captions: Object.fromEntries(Object.entries(draft.captions).filter(([, v]) => v.trim())),
    };
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "content.json";
    a.click();
    URL.revokeObjectURL(url);
    setDirty(false);
    toast("content.json downloaded 💾");
  };

  return (
    <motion.div
      className="shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="hero">
        <div className="admin-badge">⚙️ Admin</div>
        <h1>
          Ayush's
          <br />
          <em>Control Panel</em> 🛠️
        </h1>
        <p>{monthsTogether()} months in · day {(days + 1).toLocaleString()}</p>
      </header>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">❤️ Days Together</div>
          <div className="stat-value">{days.toLocaleString()}</div>
          <div className="stat-label">days elapsed</div>
        </div>
        <div className="card">
          <div className="card-title">🎯 Next Milestone</div>
          {milestone ? (
            <>
              <div className="stat-value" style={{ fontSize: "2.2rem" }}>
                {milestone.days.toLocaleString()}
              </div>
              <div className="stat-label">
                in {milestone.away} {milestone.away === 1 ? "day" : "days"} ·{" "}
                {milestone.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </>
          ) : (
            <div className="stat-label">nothing scheduled</div>
          )}
        </div>
      </div>

      <Countdowns />

      {/* ---- nudge ---- */}
      <div className="card card-full" style={{ marginBottom: "1.1rem" }}>
        <div className="card-title">💌 Send Anwi a Nudge</div>
        <p className="card-sub">Goes straight to her phone. This one really does work.</p>

        <div className="pill-grid">
          {QUICK_MESSAGES.map((m) => (
            <button key={m} className="btn btn-ghost" onClick={() => setMessage(m)}>
              {m.length > 30 ? `${m.slice(0, 30)}…` : m}
            </button>
          ))}
        </div>

        <input
          className="field"
          style={{ marginBottom: ".6rem" }}
          value={message}
          maxLength={140}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn btn-green" onClick={send} disabled={sending}>
          💚 Send Nudge
        </button>
        <div className="nudge-status">{status}</div>
      </div>

      {/* ---- nicknames ---- */}
      <div className="card card-full" style={{ marginBottom: "1.1rem" }}>
        <div className="card-title">🎰 Nickname Reel</div>
        <p className="card-sub">
          Order here is the order on her reel. Changes apply once you publish below.
        </p>

        <div className="admin-tags">
          {draft.nicknames.map((name, i) => (
            <div className="admin-tag" key={name}>
              <span>{name}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === draft.nicknames.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button onClick={() => removeNickname(name)} aria-label={`Remove ${name}`}>
                ✕
              </button>
            </div>
          ))}
          {draft.nicknames.length === 0 && <div className="empty">No nicknames yet</div>}
        </div>

        <div className="add-row">
          <input
            className="field"
            value={newNickname}
            maxLength={40}
            placeholder="Add a nickname…"
            onChange={(e) => setNewNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNickname()}
          />
          <button className="add-btn" onClick={addNickname}>
            + Add
          </button>
        </div>
      </div>

      {/* ---- captions ---- */}
      <div className="card card-full" style={{ marginBottom: "1.1rem" }}>
        <div className="card-title">✏️ Photo Captions</div>
        <p className="card-sub">
          {captioned} of {photos.length} captioned. Tap a photo, then write its line.
        </p>

        <div className="admin-strip">
          {photos.map((photo) => (
            <button
              key={photo.id}
              className="admin-thumb"
              data-selected={selected === photo.id}
              data-has-caption={Boolean(draft.captions[photo.id]?.trim())}
              onClick={() => setSelected(selected === photo.id ? null : photo.id)}
            >
              <img src={`${import.meta.env.BASE_URL}${photo.thumb}`} alt="" loading="lazy" />
            </button>
          ))}
        </div>

        {selected && (
          <div className="admin-caption">
            <img src={`${import.meta.env.BASE_URL}photos/full/${selected}.jpg`} alt="" />
            <div>
              <div className="admin-caption-id">photo {selected}</div>
              <input
                className="field"
                value={draft.captions[selected] ?? ""}
                maxLength={120}
                placeholder="Write a caption she'll see…"
                onChange={(e) => setCaption(selected, e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}
      </div>

      {/* ---- publish ---- */}
      <div className="card card-full">
        <div className="card-title">🚀 Publish Changes</div>
        <p className="card-sub">
          This site has no server, so edits can't be pushed to her phone from here. They live in{" "}
          <code>content.json</code>, which ships with the site — download it, drop it into{" "}
          <code>public/</code>, and push. It's live on her next visit.
        </p>

        <button className="btn btn-primary" onClick={download} disabled={!ready}>
          {dirty ? "💾 Download content.json" : "💾 Download content.json (no changes yet)"}
        </button>

        {dirty && <div className="admin-dirty">you have unpublished edits</div>}
      </div>

      <footer className="footer">
        admin panel &nbsp;·&nbsp; made with <span>♥</span>
      </footer>
    </motion.div>
  );
}

export default function AdminApp() {
  const [unlocked, setUnlocked] = useState(
    () => import.meta.env.DEV && new URLSearchParams(window.location.search).has("unlock"),
  );
  useTimeOfDay();

  return (
    <ToastProvider>
      <Hearts count={8} />
      <AnimatePresence mode="wait">
        {unlocked ? (
          <Panel key="panel" />
        ) : (
          <motion.div key="lock" exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.3 }}>
            <LockScreen
              onUnlock={() => setUnlocked(true)}
              password={ADMIN_PASSWORD}
              title="Ayush's Dashboard"
              blurb={"Admin access only 😤"}
              emoji="🔐"
              cta="Let Me In 💪"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </ToastProvider>
  );
}
