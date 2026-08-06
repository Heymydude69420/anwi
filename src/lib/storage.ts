/**
 * The single storage seam for the whole app.
 *
 * Every piece of state she can change flows through here. Today it writes to
 * localStorage, which needs no account and works on GitHub Pages' static
 * hosting. Swapping in a hosted database later means implementing the same
 * three methods against it — nothing outside this file has to change.
 */

const NAMESPACE = "anwi.v2";

export interface StorageAdapter {
  read<T>(key: string, fallback: T): Promise<T>;
  write<T>(key: string, value: T): Promise<void>;
  /** Fires when the same key changes somewhere else (another tab, another device). */
  watch<T>(key: string, onChange: (value: T) => void): () => void;
}

const namespaced = (key: string) => `${NAMESPACE}.${key}`;

/**
 * localStorage adapter.
 *
 * Writes are synchronous under the hood but the interface is async so a
 * network-backed adapter can drop in without turning every call site inside
 * out. Private-mode Safari throws on write, so failures degrade to in-memory
 * rather than taking the page down mid-edit.
 */
class LocalAdapter implements StorageAdapter {
  private memory = new Map<string, unknown>();

  async read<T>(key: string, fallback: T): Promise<T> {
    const full = namespaced(key);
    if (this.memory.has(full)) return this.memory.get(full) as T;
    try {
      const raw = localStorage.getItem(full);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      // Corrupt or unreadable entry: fall back rather than crash the render.
      return fallback;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    const full = namespaced(key);
    this.memory.set(full, value);
    try {
      localStorage.setItem(full, JSON.stringify(value));
    } catch {
      // Quota exceeded or private mode — the in-memory copy above still
      // keeps this session consistent.
    }
  }

  watch<T>(key: string, onChange: (value: T) => void): () => void {
    const full = namespaced(key);
    const handler = (event: StorageEvent) => {
      if (event.key !== full || event.newValue === null) return;
      try {
        onChange(JSON.parse(event.newValue) as T);
      } catch {
        /* ignore malformed cross-tab payloads */
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }
}

export const storage: StorageAdapter = new LocalAdapter();

/** Keys live here so a future migration can enumerate everything in one place. */
export const KEYS = {
  lists: "lists",
  memories: "memories",
  moodLog: "moodLog",
  tootCount: "tootCount",
  lastVisit: "lastVisit",
  streak: "streak",
} as const;
