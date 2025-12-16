import { useEffect, useMemo, useRef, useState } from "react";
import { OverlayHud, type PresetInfo } from "../ui/OverlayHud";
import { clamp } from "../ui/utils";
import { FailScreen } from "./FailScreen";
import { configureCanvas, initWebGPU } from "../gpu/webgpu";
import { createLifelabSim, type LifelabSim, type LifelabStats } from "../gpu/lifelab/sim";

type GpuState =
  | { kind: "booting" }
  | { kind: "ready"; detail: string }
  | { kind: "failed"; message: string; detail?: string };

function fmtMs(n: number) {
  return `${n.toFixed(2)}ms`;
}

function safeName(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function drawScreenshotOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[]) {
  const pad = Math.max(12, Math.floor(Math.min(w, h) * 0.015));
  const fontSize = Math.max(12, Math.floor(Math.min(w, h) * 0.018));
  ctx.save();
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  ctx.textBaseline = "top";

  // Measure block height
  const lineH = Math.floor(fontSize * 1.25);
  const blockH = pad * 2 + lineH * lines.length;
  const blockW = Math.min(w - pad * 2, Math.floor(w * 0.80));

  // Backplate
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(pad, pad, blockW, blockH);

  // Text
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  let y = pad + pad;
  for (const l of lines) {
    ctx.fillText(l, pad + pad, y, blockW - pad * 2);
    y += lineH;
  }

  ctx.restore();
}

function buildDiagnosticsLines(stats: LifelabStats, fps: number): string[] {
  const ms = stats.cpuMs;
  return [
    `FPS ~ ${fps.toFixed(1)}   dt ${stats.dt.toFixed(4)}s`,
    `Preset: ${stats.presetName}   Profile: ${stats.profile}`,
    `Particles: ${stats.particles.toLocaleString()}   Species: ${stats.species}`,
    `Res: ${stats.res.w}×${stats.res.h}`,
    `CPU: params ${fmtMs(ms.params)} · compute ${fmtMs(ms.compute)} · trails ${fmtMs(ms.trails)} · glow ${fmtMs(ms.glow)} · present ${fmtMs(ms.present)} · submit ${fmtMs(ms.submit)} · total ${fmtMs(ms.total)}`,
    `Hotkeys: P screenshot · D diagnostics · 1 hero · 2 stress`,
  ];
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dpiRef = useRef<number>(1);
  const simRef = useRef<LifelabSim | null>(null);

  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [presetId, setPresetId] = useState<number>(0);

  const [dpiScale, setDpiScale] = useState<number>(1);
  const [simHud, setSimHud] = useState<string>("");

  const [profile, setProfile] = useState<"hero" | "stress">("hero");
  const [diagnosticsOn, setDiagnosticsOn] = useState<boolean>(false);
  const [diagnosticsLines, setDiagnosticsLines] = useState<string[]>([]);

  const [gpu, setGpu] = useState<GpuState>({ kind: "booting" });

  const fpsRef = useRef<number>(0);
  const lastFrameMsRef = useRef<number>(0);
  const diagnosticsOnRef = useRef<boolean>(false);
  const lastStatsRef = useRef<LifelabStats | null>(null);

  async function doScreenshot() {
    const sim = simRef.current;
    if (!sim) return;

    try {
      const cap = await sim.requestCapture();

      // Compose + overlay
      const c = document.createElement("canvas");
      c.width = cap.w;
      c.height = cap.h;

      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("2D context not available for screenshot.");

      const img = new ImageData(cap.rgba, cap.w, cap.h);
      ctx.putImageData(img, 0, 0);

      // Overlay lines should be what you can defend in a screenshot (HUD + diagnostics)
      const s = lastStatsRef.current;
      const diag = s ? buildDiagnosticsLines(s, fpsRef.current) : [];
      const overlayLines = [
        "Inkswarm LifeLab — Screenshot",
        ...diag.slice(0, 4),
        `Captured: ${new Date().toISOString()}`,
      ].filter(Boolean);

      drawScreenshotOverlay(ctx, cap.w, cap.h, overlayLines);

      const presetName = presets.find((p) => p.id === presetId)?.name ?? "preset";
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fn = `inkswarm-lifelab__${safeName(profile)}__${safeName(presetName)}__${stamp}.png`;

      await new Promise<void>((resolve, reject) => {
        c.toBlob((b) => {
          if (!b) return reject(new Error("Failed to encode PNG."));
          downloadBlob(b, fn);
          resolve();
        }, "image/png");
      });
    } catch (err: any) {
      console.error(err);
      // Keep fail-closed but non-blocking.
      alert(`Screenshot failed: ${err?.message ?? String(err)}`);
    }
  }

  useEffect(() => {
    let raf = 0;
    let sim: LifelabSim | null = null;
    let alive = true;

    async function boot() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const { device, context, format } = await initWebGPU(canvas);

        device.addEventListener("uncapturederror", (ev: GPUUncapturedErrorEvent) => {
          const msg = (ev.error && (ev.error as GPUError).message) || "Unknown GPU error";
          if (!alive) return;
          setGpu({
            kind: "failed",
            message: "A WebGPU error occurred during execution.",
            detail: msg,
          });
        });

        device.lost.then((info: GPUDeviceLostInfo) => {
          if (!alive) return;
          setGpu({
            kind: "failed",
            message: "The WebGPU device was lost.",
            detail: `${info.reason}: ${info.message}`,
          });
        });

        sim = createLifelabSim({ device, context, format, canvas });
        simRef.current = sim;

        setPresets(sim.getPresets());
        setPresetId(sim.getPreset());
        setProfile(sim.getProfile());

        const lastUiRef = { t: 0 };

        setGpu({ kind: "ready", detail: "WebGPU initialized" });

        const tick = () => {
          if (!alive) return;

          const now = performance.now();

          // FPS smoothing
          const last = lastFrameMsRef.current || now;
          const dt = Math.max(1, now - last);
          lastFrameMsRef.current = now;
          const fps = 1000 / dt;
          fpsRef.current = fpsRef.current ? fpsRef.current * 0.92 + fps * 0.08 : fps;

          const { dpr } = configureCanvas(canvas, context, device, format);
          if (Math.abs(dpr - dpiRef.current) > 0.01) {
            dpiRef.current = dpr;
            setDpiScale(dpr);
          }

          const { hud, stats } = simRef.current!.stepAndRender(now);
          lastStatsRef.current = stats;

          // Throttle UI updates
          if (now - lastUiRef.t > 250) {
            lastUiRef.t = now;
            setSimHud(hud);
            setProfile(stats.profile);
            if (diagnosticsOnRef.current) setDiagnosticsLines(buildDiagnosticsLines(stats, fpsRef.current));
          }

          raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
      } catch (err: any) {
        if (!alive) return;

        const message = err?.message?.toString?.() || "WebGPU initialization failed.";
        const detail = err?.detail ? String(err.detail) : String(err);

        setGpu({ kind: "failed", message, detail });
      }
    }

    boot();

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      try {
        sim?.destroy();
        simRef.current = null;
      } catch {}
    };
  }, []);

  useEffect(() => {
    diagnosticsOnRef.current = diagnosticsOn;
  }, [diagnosticsOn]);


  // Hotkeys
  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (gpu.kind !== "ready") return;
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const tag = (ev.target as HTMLElement | null)?.tagName?.toLowerCase?.() ?? "";
      if (tag === "input" || tag === "textarea") return;

      const k = ev.key.toLowerCase();
      if (k === "p") {
        ev.preventDefault();
        void doScreenshot();
      } else if (k === "d") {
        ev.preventDefault();
        setDiagnosticsOn((v) => !v);
      } else if (k === "1") {
        ev.preventDefault();
        simRef.current?.setProfile("hero");
        setProfile("hero");
      } else if (k === "2") {
        ev.preventDefault();
        simRef.current?.setProfile("stress");
        setProfile("stress");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gpu.kind, diagnosticsLines, presets, presetId, profile]);

  const info = useMemo(() => {
    const status =
      gpu.kind === "booting"
        ? "Booting…"
        : gpu.kind === "ready"
          ? "WebGPU ready"
          : "WebGPU failed";

    const mode = gpu.kind === "ready" ? "WebGPU compute + trails + glow (no fallback)" : "Hard fail";

    return {
      title: "Inkswarm LifeLab",
      status: `${status} · DPR ${clamp(dpiScale, 1, 3).toFixed(2)}${gpu.kind === "ready" && simHud ? " · " + simHud : ""}`,
      mode,
    };
  }, [dpiScale, gpu.kind, simHud]);

  return (
    <div className="app-root">
      <canvas ref={canvasRef} className="sim-canvas" />

      <OverlayHud
        info={info}
        presets={presets}
        presetId={presetId}
        onPreset={(id) => {
          simRef.current?.setPreset(id);
          setPresetId(id);
        }}
        profile={profile}
        diagnosticsOn={diagnosticsOn}
        diagnosticsLines={diagnosticsLines}
        onProfile={(p) => {
          simRef.current?.setProfile(p);
          setProfile(p);
        }}
        onToggleDiagnostics={() => setDiagnosticsOn((v) => !v)}
        onScreenshot={() => void doScreenshot()}
      />

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
