export type WebGPUInitOk = {
  adapter: GPUAdapter;
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
};

export type WebGPUInitFail = {
  kind:
    | "unsupported"
    | "no-adapter"
    | "no-device"
    | "context-failed"
    | "exception";
  message: string;
  detail?: string;
};

export async function initWebGPU(canvas: HTMLCanvasElement): Promise<WebGPUInitOk> {
  if (!("gpu" in navigator)) {
    throw <WebGPUInitFail>{
      kind: "unsupported",
      message: "WebGPU is not available in this browser.",
      detail:
        "Try Chrome/Edge (stable) or a recent Chromium-based browser with updated drivers.",
    };
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });

  if (!adapter) {
    throw <WebGPUInitFail>{
      kind: "no-adapter",
      message: "WebGPU adapter request returned null.",
      detail:
        "This can happen on unsupported GPUs, in virtualized environments, or when WebGPU is blocked.",
    };
  }

  let device: GPUDevice;
  try {
    device = await adapter.requestDevice();
  } catch (err) {
    throw <WebGPUInitFail>{
      kind: "no-device",
      message: "Failed to request a WebGPU device.",
      detail: String(err),
    };
  }

  const context = canvas.getContext("webgpu");
  if (!context) {
    throw <WebGPUInitFail>{
      kind: "context-failed",
      message: "Failed to get a WebGPU canvas context.",
      detail:
        "The browser reported WebGPU support but could not create the canvas context.",
    };
  }

  const format = navigator.gpu.getPreferredCanvasFormat();

  // Initial configure. We re-configure on resize via configureCanvas().
  context.configure({
    device,
    format,
    alphaMode: "premultiplied",
  });

  return { adapter, device, context, format };
}

export function configureCanvas(
  canvas: HTMLCanvasElement,
  context: GPUCanvasContext,
  device: GPUDevice,
  format: GPUTextureFormat
) {
  // NOTE: WebGPU uses the canvas pixel size. Keep it in sync with CSS + DPR.
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;

    // Some implementations benefit from re-configure after resize.
    context.configure({
      device,
      format,
      alphaMode: "premultiplied",
    });
  }

  return { dpr, width: w, height: h };
}
