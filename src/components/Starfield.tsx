import { useEffect, useRef } from "react";

/**
 * Drifting stars behind everything, faded in by the dusk/night palette.
 *
 * Canvas rather than DOM nodes: a few hundred animated elements would cost a
 * layout pass every frame, while this is one composited surface.
 */
export function Starfield({ count = 140 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.3,
      // Each star twinkles at its own rate and offset, so the field never pulses in unison.
      speed: 0.15 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.00004,
    }));

    let frame = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        const twinkle = reduced ? 0.7 : 0.45 + 0.55 * Math.sin(t * star.speed * 2 + star.phase);
        const x = ((star.x + (reduced ? 0 : t * star.drift)) % 1) * width;
        const y = star.y * height;

        ctx.beginPath();
        ctx.arc(x, y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 246, ${twinkle * 0.85})`;
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [count]);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
