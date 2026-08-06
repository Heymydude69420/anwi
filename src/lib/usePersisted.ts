import { useCallback, useEffect, useRef, useState } from "react";
import { storage } from "./storage";

/**
 * Like useState, except the value survives a reload.
 *
 * The old app kept every list in a bare module-level variable, so each render
 * looked correct and every refresh silently threw the edits away. Routing state
 * through here makes persistence the default instead of something a call site
 * has to remember.
 *
 * Returns `ready` so the UI can hold off on painting until the stored value has
 * loaded — otherwise the seed data flashes before her real data replaces it.
 */
export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  // Held in a ref so the writer below never needs `value` as a dependency,
  // which would rebuild the callback on every keystroke.
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    let cancelled = false;
    storage.read<T>(key, initial).then((stored) => {
      if (cancelled) return;
      setValue(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // `initial` is seed data only; re-reading when it changes identity would
    // clobber whatever she has already typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Keep other tabs in sync, and give a future networked adapter a path to
  // push remote changes in without any component knowing.
  useEffect(() => storage.watch<T>(key, setValue), [key]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (current: T) => T)(latest.current)
          : next;
      latest.current = resolved;
      setValue(resolved);
      // Fire-and-forget: the UI already shows the new value, so a slow or
      // failed write must never make the interaction feel laggy.
      void storage.write(key, resolved);
    },
    [key],
  );

  return [value, update, ready] as const;
}
