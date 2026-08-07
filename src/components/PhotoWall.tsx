import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { usePhotos, type Photo } from "../lib/usePhotos";
import { useContent } from "../lib/useContent";

/**
 * The photo wall.
 *
 * Tapping a tile doesn't open a separate overlay — Framer Motion's shared
 * `layoutId` means the tile itself travels and grows into the full-size view,
 * then shrinks back into the grid on close. Doing this by hand means measuring
 * both rectangles and hand-rolling a FLIP animation; here it's one matching id.
 */
export function PhotoWall() {
  const { photos, loading } = usePhotos();
  const { content } = useContent();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const open = openIndex === null ? null : photos[openIndex];

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null || photos.length === 0) return current;
        return (current + delta + photos.length) % photos.length;
      });
    },
    [photos.length],
  );

  // Keyboard navigation while the lightbox is up.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, step]);

  // Background scroll behind a fullscreen lightbox is disorienting.
  useEffect(() => {
    if (openIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openIndex]);

  if (loading) {
    return (
      <div className="wall-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div className="wall-tile wall-skeleton" key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="wall-grid">
        {photos.map((photo, index) => (
          <motion.button
            key={photo.id}
            className="wall-tile"
            layoutId={`photo-${photo.id}`}
            onClick={() => setOpenIndex(index)}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.012, 0.5), duration: 0.4 }}
            whileHover={{ scale: 1.04, zIndex: 2 }}
            whileTap={{ scale: 0.97 }}
            aria-label={`Open photo ${index + 1}`}
          >
            <Tile photo={photo} />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenIndex(null)}
          >
            <motion.div
              className="lightbox-frame"
              layoutId={`photo-${open.id}`}
              onClick={(event) => event.stopPropagation()}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                // A decisive flick moves to the next photo; a small nudge springs back.
                if (info.offset.x < -80) step(1);
                else if (info.offset.x > 80) step(-1);
              }}
            >
              <img src={`${import.meta.env.BASE_URL}${open.full}`} alt="" draggable={false} />
              {content.captions[open.id]?.trim() && (
                <figcaption className="lightbox-caption">{content.captions[open.id]}</figcaption>
              )}
            </motion.div>

            <motion.div
              className="lightbox-bar"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.18 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button onClick={() => step(-1)} aria-label="Previous photo">
                ‹
              </button>
              <span>
                {(openIndex ?? 0) + 1} / {photos.length}
              </span>
              <button onClick={() => step(1)} aria-label="Next photo">
                ›
              </button>
            </motion.div>

            <motion.button
              className="lightbox-close"
              onClick={() => setOpenIndex(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close"
            >
              ✕
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Thumbnail that resolves out of its own blurred colours. */
function Tile({ photo }: { photo: Photo }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {photo.grid && (
        <div className="wall-blur" aria-hidden="true" data-hidden={loaded}>
          {photo.grid.map((hex, i) => (
            <span key={i} style={{ background: `#${hex}` }} />
          ))}
        </div>
      )}
      <img
        className="wall-img"
        src={`${import.meta.env.BASE_URL}${photo.thumb}`}
        alt=""
        loading="lazy"
        data-loaded={loaded}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}
