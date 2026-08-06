import { useEffect, useState } from "react";

export type Phase = "dawn" | "day" | "dusk" | "night";

export interface TimeOfDay {
  phase: Phase;
  /** 0 at midnight through 1 at the next midnight — drives continuous effects. */
  progress: number;
  hour: number;
}

function read(now: Date = new Date()): TimeOfDay {
  const hour = now.getHours();
  const progress = (hour * 60 + now.getMinutes()) / 1440;

  let phase: Phase;
  if (hour >= 5 && hour < 9) phase = "dawn";
  else if (hour >= 9 && hour < 17) phase = "day";
  else if (hour >= 17 && hour < 20) phase = "dusk";
  else phase = "night";

  return { phase, progress, hour };
}

/**
 * The page's sense of time.
 *
 * The phase is written onto <html data-phase>, so the whole palette shifts with
 * her actual local clock — warm and bright in the morning, deep and quiet after
 * dark — without any component needing to know about it.
 */
export function useTimeOfDay(): TimeOfDay {
  const [value, setValue] = useState(read);

  useEffect(() => {
    // A minute is granular enough; the phase boundaries are hourly.
    const id = window.setInterval(() => setValue(read()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.phase = value.phase;
  }, [value.phase]);

  return value;
}
