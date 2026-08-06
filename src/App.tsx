import { AnimatePresence, motion } from "framer-motion";
import { Suspense, lazy, useEffect, useState } from "react";
import { HashRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { BucketList } from "./components/BucketList";
import { CinematicHero } from "./components/CinematicHero";
import { Countdowns } from "./components/Countdowns";
import { Gallery } from "./components/Gallery";
import { Greeting } from "./components/Greeting";
import { Hearts } from "./components/Hearts";
import { LockScreen } from "./components/LockScreen";
import { MemoryJar } from "./components/MemoryJar";
import { MoodHistory } from "./components/MoodHistory";
import { NicknameSlot } from "./components/NicknameSlot";
import { Nudge } from "./components/Nudge";
import { Starfield } from "./components/Starfield";
import { ToastProvider } from "./components/Toast";
import { TootButton } from "./components/TootButton";
import { daysTogether } from "./lib/dates";
import { publish } from "./lib/ntfy";
import { useTimeOfDay } from "./lib/useTimeOfDay";

// Split out of the initial bundle: neither is needed to paint the home screen,
// and the wall pulls in the full photo manifest.
const PhotoWall = lazy(() =>
  import("./components/PhotoWall").then((m) => ({ default: m.PhotoWall })),
);
const Constellation = lazy(() =>
  import("./components/Constellation").then((m) => ({ default: m.Constellation })),
);

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function Home() {
  const days = daysTogether();
  const shownDays = useCountUp(days);

  return (
    <>
      <CinematicHero />

      <div className="grid-2">
        <div className="card">
          <div className="card-title">❤️ Days Together</div>
          <div className="stat-value">{shownDays.toLocaleString()}</div>
          <div className="stat-label">days of putting up with me</div>
        </div>
        <div className="card">
          <div className="card-title">💘 Couple Score</div>
          <div className="stat-value" style={{ fontSize: "2.2rem" }}>
            100%
          </div>
          <div className="stat-label">certified soulmates</div>
        </div>
      </div>

      <Countdowns />
      <NicknameSlot />

      <Greeting />
      <BucketList />

      <div className="grid-2">
        <Gallery />
        <div className="card">
          <Nudge />
          <div className="divider" />
          <MoodHistory
            onLog={(mood, emoji) =>
              void publish(`Anwi is feeling ${mood} ${emoji}`, "💚 mood update from Anwi")
            }
          />
          <div className="divider" />
          <TootButton />
        </div>
      </div>

      <MemoryJar />
    </>
  );
}

function WallPage() {
  return (
    <>
      <PageHead
        title="The Wall"
        sub="every photo, all at once — tap one and it comes to you"
      />
      <PhotoWall />
    </>
  );
}

function UsPage() {
  return (
    <>
      <PageHead title="Us" sub="one star for every day we've been together" />
      <Constellation />
    </>
  );
}

function PageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <motion.div
      className="page-head"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <h1>{title}</h1>
      <p>{sub}</p>
    </motion.div>
  );
}

const TABS = [
  { to: "/", label: "🏡 Corner", end: true },
  { to: "/wall", label: "🖼️ The Wall", end: false },
  { to: "/us", label: "✨ Us", end: false },
];

function Nav() {
  return (
    <nav className="nav">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className="nav-tab">
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Shell() {
  const location = useLocation();

  return (
    <div className="shell">
      <Nav />
      {/* Keyed on pathname so each route mounts and unmounts as its own scene. */}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<div className="route-loading">loading…</div>}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/wall" element={<WallPage />} />
              <Route path="/us" element={<UsPage />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </motion.main>
      </AnimatePresence>

      <footer className="footer">
        made with <span>♥</span> by ayush, just for you
      </footer>
    </div>
  );
}

const devUnlock = () =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).has("unlock");

export default function App() {
  const [unlocked, setUnlocked] = useState(devUnlock);
  useTimeOfDay();

  return (
    <ToastProvider>
      <Starfield />
      <Hearts />
      <AnimatePresence mode="wait">
        {unlocked ? (
          <HashRouter key="app">
            <Shell />
          </HashRouter>
        ) : (
          <motion.div key="lock" exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.35 }}>
            <LockScreen onUnlock={() => setUnlocked(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </ToastProvider>
  );
}
