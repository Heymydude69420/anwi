const COLORS = ["#e8405a", "#8fbc74", "#ffc5ce", "#b8d9a3", "#ffb3c6", "#dff0d4", "#ffffff"];

/**
 * Burst of confetti at a viewport point.
 *
 * Uses the Web Animations API and cleans each piece up on finish, so repeated
 * bursts can't pile up detached nodes the way the old setTimeout version could.
 */
export function confetti(x: number, y: number, count = 28) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    const size = 6 + Math.random() * 5;

    Object.assign(piece.style, {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size * (0.4 + Math.random() * 0.8)}px`,
      background: COLORS[(Math.random() * COLORS.length) | 0],
      borderRadius: "2px",
      pointerEvents: "none",
      zIndex: "250",
      willChange: "transform, opacity",
    } satisfies Partial<CSSStyleDeclaration>);

    document.body.appendChild(piece);

    const angle = Math.random() * Math.PI * 2;
    const velocity = 60 + Math.random() * 170;
    const driftX = Math.cos(angle) * velocity;
    const driftY = Math.sin(angle) * velocity - 90; // bias upward before falling

    piece
      .animate(
        [
          { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(${driftX - 50}%, ${driftY + 260}px) rotate(${
              Math.random() * 900 - 450
            }deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 900 + Math.random() * 700,
          easing: "cubic-bezier(0.2, 0.6, 0.35, 1)",
          fill: "forwards",
        },
      )
      .finished.catch(() => {})
      .finally(() => piece.remove());
  }
}
