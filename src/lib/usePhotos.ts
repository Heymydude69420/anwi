import { useEffect, useState } from "react";

export interface Photo {
  id: string;
  full: string;
  thumb: string;
  /** 12 hex colours sampled on a 4x3 grid, for the blur-up placeholder. */
  grid?: string[];
  /** Average colour of the photo. */
  tint?: string;
}

let cache: Photo[] | null = null;
let inflight: Promise<Photo[]> | null = null;

/** Fetched once per page load and shared — several components want this list. */
function load(): Promise<Photo[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch(`${import.meta.env.BASE_URL}photos/manifest.json`)
    .then((response) => (response.ok ? response.json() : { photos: [] }))
    .then((data: { photos?: Photo[] }) => {
      cache = data.photos ?? [];
      return cache;
    })
    .catch(() => {
      cache = [];
      return cache;
    });

  return inflight;
}

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let active = true;
    load().then((list) => {
      if (!active) return;
      setPhotos(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { photos, loading };
}
