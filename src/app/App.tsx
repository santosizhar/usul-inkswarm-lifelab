import { useEffect, useMemo, useRef, useState } from "react";
import { OverlayHud } from "../ui/OverlayHud";
import { clamp } from "../ui/utils";
import { FailScreen } from "./FailScreen";
import { configureCanvas, initWebGPU } from "../gpu/webgpu";
import { createLifelabSim, type LifelabSim } from "../gpu/lifelab/sim";
type GpuState =
  | { kind: "booting" }
  | { kind: "ready"; detail: string }
  | { kind: "failed"; message: string; detail?: string };

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dpiRef = useRef<number>(1);

  const [dpiScale, setDpiScale] = useState<number>(1);
  const [simHud, setSimHud] = useState<string>("");
  const [gpu, setGpu] = useState<GpuState>({ kind: "booting" });

  useEffect(() => {
    let raf = 0;
    let sim: LifelabSim | null = null;
    let alive = true;

    async function boot() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const { device, context, format } = await initWebGPU(canvas);

        device.addEventListener("uncapturederror", (ev) => {
          const msg =
            (ev.error && (ev.error as GPUError).message) || "Unknown GPU error";
          if (!alive) return;
          setGpu({
            kind: "failed",
            message: "A WebGPU error occurred during execution.",
            detail: msg,
          });
        });

        device.lost.then((info) => {
          if (!alive) return;
          setGpu({
            kind: "failed",
            message: "The WebGPU device was lost.",
            detail: `${info.reason}: ${info.message}`,
          });
        });

        sim = createLifelabSim({ device, context, format, canvas });
        const lastHudRef = { t: 0 };

        setGpu({ kind: "ready", detail: "WebGPU initialized" });

        const tick = () => {
          if (!alive) return;

          const { dpr } = configureCanvas(canvas, context, device, format);
          if (Math.abs(dpr - dpiRef.current) > 0.01) {
            dpiRef.current = dpr;
            setDpiScale(dpr);
          }
          const { hud } = sim!.stepAndRender(performance.now());
          if (performance.now() - lastHudRef.t > 250) {
            lastHudRef.t = performance.now();
            setSimHud(hud);
          }
raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
      } catch (err: any) {
        if (!alive) return;

        const message =
          err?.message?.toString?.() || "WebGPU initialization failed.";
        const detail = err?.detail ? String(err.detail) : String(err);

        setGpu({ kind: "failed", message, detail });
      }
    }

    boot();

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      try { sim?.destroy(); } catch {}
    };
  }, []);

  const info = useMemo(() => {
    const status =
      gpu.kind === "booting"
        ? "Booting…"
        : gpu.kind === "ready"
          ? "WebGPU ready"
          : "WebGPU failed";

    const mode = gpu.kind === "ready" ? "Seeded sim (WebGPU compute + render)" : "Hard fail";

    return {
      title: "Inkswarm LifeLab",
      status: `${status} · DPR ${clamp(dpiScale, 1, 3).toFixed(2)}${gpu.kind === "ready" && simHud ? " · " + simHud : ""}`,
      mode,
    };
  }, [dpiScale, gpu.kind, simHud]);

  return (
    <div className="app-root">
      <canvas ref={canvasRef} className="sim-canvas" />
      <OverlayHud info={info} />
      {gpu.kind === "failed" ? (
        <FailScreen
          info={{
            title: "WebGPU Unavailable",
            message: gpu.message,
            detail: gpu.detail,
          }}
        />
      ) : null}
    </div>
  );
}
