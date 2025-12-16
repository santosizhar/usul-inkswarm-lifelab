import { useEffect, useMemo, useRef, useState } from "react";
import { OverlayHud } from "../ui/OverlayHud";
import { clamp } from "../ui/utils";

/**
 * D-0001: Canvas mount + UI shell.
 * NOTE: WebGPU is introduced in D-0002. Here we render a lightweight placeholder frame
 * using 2D just to confirm sizing + overlay stacking works.
 */
export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dpiScale, setDpiScale] = useState<number>(1);

  const info = useMemo(() => {
    return {
      title: "Inkswarm LifeLab",
      status: "Scaffold ready (D-0001)",
      mode: "Start-coding mode",
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = clamp(window.devicePixelRatio || 1, 1, 3);
      setDpiScale(dpr);

      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t0 = performance.now();

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - t0) / 1000);
      t0 = t;

      // Placeholder: simple animated vignette to verify render loop + sizing.
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const g = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.1,
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.7
      );
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.001);
      g.addColorStop(0, `rgba(25, 25, 35, ${0.95})`);
      g.addColorStop(1, `rgba(5, 5, 10, ${0.95 - 0.15 * pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // A tiny moving marker (visual sanity check).
      const x = (0.5 + 0.35 * Math.sin(t * 0.0006)) * w;
      const y = (0.5 + 0.35 * Math.cos(t * 0.0005)) * h;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(x, y, 2 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(tick);
      void dt;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dpiScale]);

  return (
    <div className="app-root">
      <canvas ref={canvasRef} className="sim-canvas" />
      <OverlayHud info={info} />
    </div>
  );
}
