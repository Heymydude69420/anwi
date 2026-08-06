import { useEffect, useState } from "react";
import {
  countdownTo,
  nextAnniversary,
  nextMonthiversary,
  type Countdown,
} from "../lib/dates";

const pad = (n: number) => String(n).padStart(2, "0");

function useTick() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function Clock({ value }: { value: Countdown }) {
  const cells = [
    { n: value.days, tag: "days" },
    { n: value.hours, tag: "hrs" },
    { n: value.minutes, tag: "min" },
    { n: value.seconds, tag: "sec" },
  ];

  return (
    <div className="countdown-row">
      {cells.map((cell) => (
        <div className="countdown-cell" key={cell.tag}>
          <span className="countdown-num">{pad(cell.n)}</span>
          <div className="countdown-tag">{cell.tag}</div>
        </div>
      ))}
    </div>
  );
}

export function Countdowns() {
  const now = useTick();

  // Both targets are derived from `now` every tick, so neither can get stuck
  // the way the hardcoded 2-year date and the averaged monthiversary did.
  const monthly = nextMonthiversary(now);
  const yearly = nextAnniversary(now);

  const monthLabel = monthly.date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const yearLabel = yearly.date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-title">🗓️ Next Month-iversary</div>
        <div className="countdown-when">
          {monthly.number} months — {monthLabel}
        </div>
        <Clock value={countdownTo(monthly.date, now)} />
      </div>

      <div className="card">
        <div className="card-title">🎉 {yearly.years}-Year Anniversary</div>
        <div className="countdown-when">{yearLabel} 🥳</div>
        <Clock value={countdownTo(yearly.date, now)} />
      </div>
    </div>
  );
}
