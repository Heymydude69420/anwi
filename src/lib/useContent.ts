import { useEffect, useState } from "react";

export interface SiteContent {
  nicknames: string[];
  /** Photo id (e.g. "007") to caption. */
  captions: Record<string, string>;
}

export const DEFAULT_CONTENT: SiteContent = {
  nicknames: ["sweetie pie", "pumpkin pie", "muffin", "cupcake", "peanut", "buttercup"],
  captions: {},
};

/**
 * Editable content that ships with the site.
 *
 * The old admin page kept nicknames in a `let` inside its own file and claimed
 * edits reached her page; nothing propagated, because the two pages share no
 * storage. On static hosting there is no server to write to and localStorage is
 * per-device, so the only thing both pages can genuinely agree on is a file
 * served alongside them. The admin panel edits this and hands back a new copy
 * to commit.
 */
let cache: SiteContent | null = null;
let inflight: Promise<SiteContent> | null = null;

export function loadContent(): Promise<SiteContent> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch(`${import.meta.env.BASE_URL}content.json`)
    .then((response) => (response.ok ? response.json() : DEFAULT_CONTENT))
    .then((data: Partial<SiteContent>) => {
      cache = {
        nicknames: data.nicknames?.length ? data.nicknames : DEFAULT_CONTENT.nicknames,
        captions: data.captions ?? {},
      };
      return cache;
    })
    .catch(() => {
      cache = DEFAULT_CONTENT;
      return cache;
    });

  return inflight;
}

export function useContent() {
  const [content, setContent] = useState<SiteContent>(cache ?? DEFAULT_CONTENT);
  const [ready, setReady] = useState(cache !== null);

  useEffect(() => {
    let active = true;
    loadContent().then((value) => {
      if (!active) return;
      setContent(value);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return { content, ready };
}
