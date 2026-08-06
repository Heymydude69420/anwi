import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { pickForToday, todayKey } from "../lib/daily";
import { addPhotos, allPhotos, removePhoto, type UploadedPhoto } from "../lib/photoStore";
import { useToast } from "./Toast";

interface ManifestEntry {
  id: string;
  full: string;
  thumb: string;
}

type Shown =
  | { kind: "archive"; src: string; label: string }
  | { kind: "ayush"; src: string; label: string; id: string };

export function Gallery() {
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [uploads, setUploads] = useState<UploadedPhoto[]>([]);
  const [shown, setShown] = useState<Shown | null>(null);
  const [busy, setBusy] = useState(false);
  const lastArchive = useRef<string>("");
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Object URLs are revoked on unmount; leaking them keeps the blobs alive.
  const urls = useRef(new Map<string, string>());
  const urlFor = (photo: UploadedPhoto) => {
    let url = urls.current.get(photo.id);
    if (!url) {
      url = URL.createObjectURL(photo.blob);
      urls.current.set(photo.id, url);
    }
    return url;
  };

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}photos/manifest.json`)
      .then((response) => (response.ok ? response.json() : { photos: [] }))
      .then((data: { photos: ManifestEntry[] }) => setManifest(data.photos ?? []))
      .catch(() => setManifest([]));

    allPhotos().then(setUploads);

    const cache = urls.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  const surpriseMe = () => {
    if (manifest.length === 0) return;
    let next: ManifestEntry;
    do {
      next = manifest[(Math.random() * manifest.length) | 0];
    } while (next.id === lastArchive.current && manifest.length > 1);
    lastArchive.current = next.id;
    setShown({
      kind: "archive",
      src: `${import.meta.env.BASE_URL}${next.full}`,
      label: "one of my favourites of you 💚",
    });
  };

  const dailyAyush = () => {
    if (uploads.length === 0) {
      toast("Add some photos of me first 📸");
      return;
    }
    // Seeded by the calendar day, so it holds steady until midnight instead of
    // re-rolling every time she taps.
    const pick = pickForToday(uploads, "ayush")!;
    setShown({
      kind: "ayush",
      id: pick.id,
      src: urlFor(pick),
      label: pick.caption || "your Ayush for today 💚",
    });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const added = await addPhotos(Array.from(files));
      if (added.length === 0) {
        toast("those didn't look like images 🤔");
        return;
      }
      setUploads((current) => [...current, ...added]);
      toast(`added ${added.length} photo${added.length > 1 ? "s" : ""} 💚`);
    } catch {
      toast("couldn't save those, sorry 😕");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const deleteShown = async () => {
    if (shown?.kind !== "ayush") return;
    await removePhoto(shown.id);
    const url = urls.current.get(shown.id);
    if (url) {
      URL.revokeObjectURL(url);
      urls.current.delete(shown.id);
    }
    setUploads((current) => current.filter((photo) => photo.id !== shown.id));
    setShown(null);
    toast("removed 🗑️");
  };

  return (
    <div className="card">
      <div className="card-title">📸 Mini Pekka Gallery</div>

      <div className="gallery-actions">
        <button className="btn btn-primary" onClick={surpriseMe} disabled={manifest.length === 0}>
          🎲 Surprise Me!
        </button>
        <button className="btn btn-green" onClick={dailyAyush}>
          ☀️ Today's Ayush
        </button>
      </div>

      <div className="photo-frame">
        <AnimatePresence mode="wait">
          {shown ? (
            <motion.figure
              key={shown.src}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <img src={shown.src} alt={shown.label} loading="lazy" />
              <figcaption>
                {shown.label}
                {shown.kind === "ayush" && (
                  <button className="photo-remove" onClick={deleteShown} aria-label="Remove photo">
                    ✕
                  </button>
                )}
              </figcaption>
            </motion.figure>
          ) : (
            <motion.div
              key="idle"
              className="photo-idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span>🖼️</span>
              <p>
                {manifest.length > 0
                  ? `${manifest.length} photos waiting — tap a button 💕`
                  : "no photos found yet"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="upload-zone">
        <div className="upload-head">
          <strong>Your photos of Ayush</strong>
          <span>
            {uploads.length} saved
            {uploads.length > 0 && ` · today's pick rotates ${todayKey() ? "at midnight" : ""}`}
          </span>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => onFiles(event.target.files)}
        />

        <button
          className="btn btn-ghost upload-btn"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
        >
          {busy ? "saving…" : "＋ Add photos of Ayush"}
        </button>

        {uploads.length > 0 && (
          <div className="upload-strip">
            {uploads.map((photo) => (
              <button
                key={photo.id}
                className="upload-thumb"
                onClick={() =>
                  setShown({
                    kind: "ayush",
                    id: photo.id,
                    src: urlFor(photo),
                    label: photo.caption || "one you saved 💚",
                  })
                }
              >
                <img src={urlFor(photo)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
