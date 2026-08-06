import { useMemo } from "react";

const GLYPHS = ["💚", "🩷", "❤️", "💕", "🫶", "💗", "💓"];

/**
 * Ambient background hearts.
 *
 * Positions are generated once and memoised — regenerating them on re-render
 * would restart every animation and make the field visibly jump.
 */
export function Hearts({ count = 16 }: { count?: number }) {
  const hearts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        glyph: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        left: Math.random() * 100,
        size: 0.8 + Math.random(),
        duration: 9 + Math.random() * 13,
        delay: Math.random() * 14,
      })),
    [count],
  );

  return (
    <div className="hearts" aria-hidden="true">
      {hearts.map((heart) => (
        <span
          key={heart.id}
          className="heart"
          style={{
            left: `${heart.left}%`,
            fontSize: `${heart.size}rem`,
            animationDuration: `${heart.duration}s`,
            animationDelay: `${heart.delay}s`,
          }}
        >
          {heart.glyph}
        </span>
      ))}
    </div>
  );
}
