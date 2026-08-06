import { motion } from "framer-motion";
import { useMemo } from "react";

const BANDS = [
  {
    until: 12,
    emoji: "☀️",
    line: "Good morning, Anwi 💚",
    subs: [
      "Hope today is as cute as you are",
      "Rise and shine, sweetie pie ☕",
      "A new day with you in it 🌸",
      "Today's forecast: adorable 💕",
    ],
  },
  {
    until: 17,
    emoji: "🌤️",
    line: "Good afternoon, Anwi 💚",
    subs: [
      "Hope your day is going great",
      "Thinking of you rn 🥹",
      "Midday check-in: still cute? yes ✅",
      "You're my favorite part of every day",
    ],
  },
  {
    until: 21,
    emoji: "🌇",
    line: "Good evening, Anwi 💚",
    subs: [
      "Hope today was a good one 🌸",
      "Winding down with you in mind 💕",
      "The best part of evenings? you 🥹",
      "Almost time to relax, you deserve it",
    ],
  },
  {
    until: 24,
    emoji: "🌙",
    line: "Good night, Anwi 💚",
    subs: [
      "Don't stay up too late 🥱",
      "Sweet dreams, my little tooter 💨😂",
      "Go to sleep!! 😤💚",
      "You deserve all the rest, goodnight 🌙",
    ],
  },
] as const;

export function Greeting() {
  const { emoji, line, sub } = useMemo(() => {
    const hour = new Date().getHours();
    // Hours before 5am belong to the night band, which sorts last.
    const band = hour < 5 ? BANDS[3] : (BANDS.find((b) => hour < b.until) ?? BANDS[3]);
    return {
      emoji: band.emoji,
      line: band.line,
      sub: band.subs[(Math.random() * band.subs.length) | 0],
    };
  }, []);

  return (
    <motion.div
      className="greeting"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="greeting-emoji"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {emoji}
      </motion.div>
      <div>
        <div className="greeting-line">{line}</div>
        <div className="greeting-sub">{sub}</div>
      </div>
    </motion.div>
  );
}
