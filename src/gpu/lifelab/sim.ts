import { LIFELAB_WGSL } from "./wgsl";

export type LifelabPresetInfo = { id: number; name: string };

export type LifelabStats = {
  presetId: number;
  presetName: string;
  profile: "hero" | "stress";
  particles: number;
  species: number;
  res: { w: number; h: number };
  dt: number;
  fpsHint?: number;
  cpuMs: {
    params: number;
    compute: number;
    trails: number;
    glow: number;
    present: number;
    capture: number;
    submit: number;
    total: number;
  };
};

export type LifelabCapture = {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
};

export type LifelabSim = {
  stepAndRender: (nowMs: number) => { hud: string; stats: LifelabStats };
  requestCapture: () => Promise<LifelabCapture>;
  setProfile: (p: "hero" | "stress") => void;
  getProfile: () => "hero" | "stress";
  setPreset: (presetId: number) => void;
  getPresets: () => LifelabPresetInfo[];
  getPreset: () => number;
  destroy: () => void;
};

const MAX_SPECIES = 10;

// ---- Packed uniforms ----
type PackedParams = {
  resX: number;
  resY: number;
  time: number;
  dt: number;
  numParticles: number;
  speciesCount: number;
  gridDim: number;
  cellCap: number;
};

function packParams(p: PackedParams): ArrayBuffer {
  // 8 floats/uints packed as 32 bytes
  const buf = new ArrayBuffer(32);
  const dv = new DataView(buf);
  dv.setFloat32(0, p.resX, true);
  dv.setFloat32(4, p.resY, true);
  dv.setFloat32(8, p.time, true);
  dv.setFloat32(12, p.dt, true);
  dv.setUint32(16, p.numParticles >>> 0, true);
  dv.setUint32(20, p.speciesCount >>> 0, true);
  dv.setUint32(24, p.gridDim >>> 0, true);
  dv.setUint32(28, p.cellCap >>> 0, true);
  return buf;
}

type PostParams = {
  resX: number;
  resY: number;
  glowResX: number;
  glowResY: number;
  trailDecay: number;
  exposure: number;
  glowStrength: number;
};

function packPostParams(p: PostParams): ArrayBuffer {
  // PostParams struct is 32 bytes:
  // vec2f res (8) + vec2f glowRes (8) + 4 floats (16) = 32
  const buf = new ArrayBuffer(32);
  const dv = new DataView(buf);
  dv.setFloat32(0, p.resX, true);
  dv.setFloat32(4, p.resY, true);
  dv.setFloat32(8, p.glowResX, true);
  dv.setFloat32(12, p.glowResY, true);
  dv.setFloat32(16, p.trailDecay, true);
  dv.setFloat32(20, p.exposure, true);
  dv.setFloat32(24, p.glowStrength, true);
  dv.setFloat32(28, 0.0, true);
  return buf;
}

// ---- Deterministic RNG helpers ----
function makeLCG(seed: number) {
  let s = seed >>> 0;
  return () => {
    // LCG constants
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function createInteractionMatrix(seed: number, presetId: number): Float32Array {
  const rnd = makeLCG((seed ^ (presetId * 0x9e3779b9)) >>> 0);
  const m = new Float32Array(MAX_SPECIES * MAX_SPECIES);

  // Curated patterns (still deterministic). Values are small; WGSL integrates and clamps.
  for (let i = 0; i < MAX_SPECIES; i++) {
    for (let j = 0; j < MAX_SPECIES; j++) {
      const idx = i * MAX_SPECIES + j;

      // Base: gentle repulsion to avoid clumping too hard
      let v = -0.15;

      if (presetId === 0) {
        // "Ink Vortex": self-attraction + spiral-ish asymmetry
        v += i === j ? 0.55 : -0.10;
        v += (i - j) % 3 === 0 ? 0.18 : 0.0;
      } else if (presetId === 1) {
        // "Neon Kelp": cyclic attraction chain
        v += (j === (i + 1) % MAX_SPECIES) ? 0.50 : 0.0;
        v += (j === (i + MAX_SPECIES - 1) % MAX_SPECIES) ? -0.25 : 0.0;
      } else if (presetId === 2) {
        // "Predator Bloom": asymmetric predator/prey blocks
        const band = (i % 2) - (j % 2);
        v += band === 1 ? 0.45 : band === -1 ? -0.35 : 0.10;
      } else if (presetId === 3) {
        // "Quiet Nebula": mostly calm, small random texture
        v += (rnd() - 0.5) * 0.18;
        v += i === j ? 0.20 : -0.05;
      } else {
        // "Chaos Inkstorm": random but bounded
        v = (rnd() * 2 - 1) * 0.55;
      }

      // Tiny deterministic jitter prevents dead-symmetry
      v += (rnd() - 0.5) * 0.06;

      m[idx] = v;
    }
  }

  return m;
}

function makePalette(speciesCount: number, presetId: number): Float32Array {
  // Uniform array<vec4f, 10>
  const out = new Float32Array(MAX_SPECIES * 4);

  // Simple curated palettes; alpha is also used in particle FS for brightness.
  const palettes: Array<Array<[number, number, number, number]>> = [
    // 0: Ink Vortex (cool ink + paper glow)
    [
      [0.70, 0.85, 1.00, 0.90],
      [0.25, 0.55, 0.95, 0.90],
      [0.55, 0.35, 0.95, 0.90],
      [0.95, 0.45, 0.55, 0.90],
      [0.95, 0.85, 0.35, 0.90],
    ],
    // 1: Neon Kelp (teals/greens)
    [
      [0.20, 1.00, 0.85, 0.90],
      [0.10, 0.65, 0.95, 0.90],
      [0.55, 0.95, 0.35, 0.90],
      [0.85, 1.00, 0.35, 0.90],
      [0.95, 0.55, 0.35, 0.90],
    ],
    // 2: Predator Bloom (magenta/orange)
    [
      [1.00, 0.25, 0.85, 0.90],
      [0.95, 0.35, 0.45, 0.90],
      [1.00, 0.65, 0.25, 0.90],
      [0.85, 0.85, 0.30, 0.90],
      [0.35, 0.95, 0.75, 0.90],
    ],
    // 3: Quiet Nebula (soft)
    [
      [0.85, 0.85, 0.95, 0.85],
      [0.65, 0.75, 0.95, 0.85],
      [0.85, 0.65, 0.95, 0.85],
      [0.95, 0.75, 0.65, 0.85],
      [0.75, 0.95, 0.65, 0.85],
    ],
    // 4: Chaos Inkstorm (high contrast)
    [
      [1.00, 1.00, 1.00, 0.95],
      [0.95, 0.35, 0.95, 0.95],
      [0.25, 0.95, 0.95, 0.95],
      [0.95, 0.95, 0.25, 0.95],
      [0.95, 0.35, 0.25, 0.95],
    ],
  ];

  const palette = palettes[Math.max(0, Math.min(palettes.length - 1, presetId))]!;

  for (let i = 0; i < MAX_SPECIES; i++) {
    const c = palette[i % palette.length]!;
    out[i * 4 + 0] = c[0];
    out[i * 4 + 1] = c[1];
    out[i * 4 + 2] = c[2];
    out[i * 4 + 3] = c[3];
  }

  // If fewer species, keep remaining palette entries harmless (still set, just unused).
  void speciesCount;
  return out;
}

function seedParticles(num: number, speciesCount: number, seed: number): ArrayBuffer {
  // Particle stride = 32 bytes (see WGSL Particle)
  const stride = 32;
  const buf = new ArrayBuffer(num * stride);
  const dv = new DataView(buf);

  const rnd = makeLCG(seed);
  for (let i = 0; i < num; i++) {
    const base = i * stride;

    // position in [0,1]
    const x = rnd();
    const y = rnd();

    // initial velocity (small)
    const vx = (rnd() * 2 - 1) * 0.05;
    const vy = (rnd() * 2 - 1) * 0.05;

    const species = Math.floor(rnd() * speciesCount) >>> 0;

    // energy in [0.25, 1]
    const energy = 0.25 + rnd() * 0.75;

    // size in px-ish (5..11) * energy
    const size = (5 + rnd() * 6) * (0.65 + 0.35 * energy);

    dv.setFloat32(base + 0, x, true);
    dv.setFloat32(base + 4, y, true);
    dv.setFloat32(base + 8, vx, true);
    dv.setFloat32(base + 12, vy, true);
    dv.setUint32(base + 16, species, true);
    dv.setFloat32(base + 20, energy, true);
    dv.setFloat32(base + 24, size, true);
    dv.setFloat32(base + 28, 0.0, true);
  }

  return buf;
}

const PRESETS: Array<{ id: number; name: string; trailDecay: number; exposure: number; glowStrength: number }> = [
  { id: 0, name: "Ink Vortex", trailDecay: 0.945, exposure: 1.10, glowStrength: 0.55 },
  { id: 1, name: "Neon Kelp", trailDecay: 0.955, exposure: 1.05, glowStrength: 0.65 },
  { id: 2, name: "Predator Bloom", trailDecay: 0.940, exposure: 1.15, glowStrength: 0.75 },
  { id: 3, name: "Quiet Nebula", trailDecay: 0.965, exposure: 0.95, glowStrength: 0.45 },
  { id: 4, name: "Chaos Inkstorm", trailDecay: 0.935, exposure: 1.25, glowStrength: 0.85 },
];

function createModule(device: GPUDevice) {
  return device.createShaderModule({ code: LIFELAB_WGSL });
}

export function createLifelabSim(args: {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  canvas: HTMLCanvasElement;
  seed?: number;
  numParticles?: number;
  speciesCount?: number;
}): LifelabSim {
  const { device, context, format, canvas } = args;
  const seed = args.seed ?? 1337;
  const heroParticles = args.numParticles ?? 30_000;
  const stressParticles = Math.max(heroParticles * 2, 80_000);
  const maxParticles = Math.max(heroParticles, stressParticles);
  let activeParticles = heroParticles;
  let profile: "hero" | "stress" = "hero";

  const speciesCount = Math.max(2, Math.min(MAX_SPECIES, args.speciesCount ?? 6));

  const gridDim = 128;
  const cellCap = 16;

  // NOTE: This project is WebGPU-only. We'll keep a simple trail buffer format.
  const trailFormat: GPUTextureFormat = "rgba8unorm";

  const module = createModule(device);

  // --- Buffers ---
  const particleStride = 32;
  const particleBytes = maxParticles * particleStride;

  const particlesA = device.createBuffer({
    size: particleBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const particlesB = device.createBuffer({
    size: particleBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const paramsBuf = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cellCount = gridDim * gridDim;
  const cellCountsBuf = device.createBuffer({
    size: cellCount * 4,
    usage: GPUBufferUsage.STORAGE,
  });

  const cellSlotsBuf = device.createBuffer({
    size: cellCount * cellCap * 4,
    usage: GPUBufferUsage.STORAGE,
  });

  const interactionBuf = device.createBuffer({
    size: MAX_SPECIES * MAX_SPECIES * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const paletteBuf = device.createBuffer({
    size: MAX_SPECIES * 16, // array<vec4f,10>
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const postParamsBuf = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Seed initial data (D-0003)
  device.queue.writeBuffer(particlesA, 0, seedParticles(maxParticles, speciesCount, seed ^ 0xC0FFEE));
  device.queue.writeBuffer(particlesB, 0, seedParticles(maxParticles, speciesCount, (seed ^ 0xa5a5a5a5) ^ 0xBADC0DE));

  // ---- Bind group layouts (note: WGSL uses groups 0 (sim), 1 (particles render), 2 (post)) ----
  const simBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
    ],
  });

  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });

  const postBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });

  // Unified pipeline layout (groups 0..2)
  const unifiedLayout = device.createPipelineLayout({
    bindGroupLayouts: [simBGL, renderBGL, postBGL],
  });

  // --- Compute pipelines ---
  const csClear = device.createComputePipeline({
    layout: unifiedLayout,
    compute: { module, entryPoint: "cs_clearCounts" },
  });
  const csBuild = device.createComputePipeline({
    layout: unifiedLayout,
    compute: { module, entryPoint: "cs_buildGrid" },
  });
  const csSim = device.createComputePipeline({
    layout: unifiedLayout,
    compute: { module, entryPoint: "cs_simulate" },
  });

  // --- Particle render pipeline (writes into trail target) ---
  const particlePipeline = device.createRenderPipeline({
    layout: unifiedLayout,
    vertex: { module, entryPoint: "vs_particles" },
    fragment: {
      module,
      entryPoint: "fs_particles",
      targets: [
        {
          format: trailFormat,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list", cullMode: "none" },
  });

  // --- Postprocess pipelines ---
  const decayPipeline = device.createRenderPipeline({
    layout: unifiedLayout,
    vertex: { module, entryPoint: "vs_fullscreen" },
    fragment: { module, entryPoint: "fs_decay", targets: [{ format: trailFormat }] },
    primitive: { topology: "triangle-list", cullMode: "none" },
  });

  const glowPipeline = device.createRenderPipeline({
    layout: unifiedLayout,
    vertex: { module, entryPoint: "vs_fullscreen" },
    fragment: { module, entryPoint: "fs_glow", targets: [{ format: trailFormat }] },
    primitive: { topology: "triangle-list", cullMode: "none" },
  });

  const presentPipeline = device.createRenderPipeline({
    layout: unifiedLayout,
    vertex: { module, entryPoint: "vs_fullscreen" },
    fragment: {
      module,
      entryPoint: "fs_present",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list", cullMode: "none" },
  });

  // Persistent sim bind groups (CR-0002 perf fix kept)
  const simBG_AB = device.createBindGroup({
    layout: simBGL,
    entries: [
      { binding: 0, resource: { buffer: particlesA } },
      { binding: 1, resource: { buffer: particlesB } },
      { binding: 2, resource: { buffer: paramsBuf } },
      { binding: 3, resource: { buffer: cellCountsBuf } },
      { binding: 4, resource: { buffer: cellSlotsBuf } },
      { binding: 5, resource: { buffer: interactionBuf } },
    ],
  });

  const simBG_BA = device.createBindGroup({
    layout: simBGL,
    entries: [
      { binding: 0, resource: { buffer: particlesB } },
      { binding: 1, resource: { buffer: particlesA } },
      { binding: 2, resource: { buffer: paramsBuf } },
      { binding: 3, resource: { buffer: cellCountsBuf } },
      { binding: 4, resource: { buffer: cellSlotsBuf } },
      { binding: 5, resource: { buffer: interactionBuf } },
    ],
  });

  const renderBG_A = device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: particlesA } },
      { binding: 1, resource: { buffer: paramsBuf } },
      { binding: 2, resource: { buffer: paletteBuf } },
    ],
  });

  const renderBG_B = device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: particlesB } },
      { binding: 1, resource: { buffer: paramsBuf } },
      { binding: 2, resource: { buffer: paletteBuf } },
    ],
  });

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  // --- Trail + glow render targets (D-0005/D-0006) ---
  let trailA: GPUTexture | null = null;
  let trailB: GPUTexture | null = null;
  let glowTex: GPUTexture | null = null;
  let targetW = 0;
  let targetH = 0;
  let glowW = 0;
  let glowH = 0;

  let trailPing = true;

  const makeTarget = (w: number, h: number) =>
    device.createTexture({
      size: { width: w, height: h },
      format: trailFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

  function ensureTargets() {
    const w = Math.max(1, canvas.width | 0);
    const h = Math.max(1, canvas.height | 0);

    if (w === targetW && h === targetH && trailA && trailB && glowTex) return;

    targetW = w;
    targetH = h;

    // Glow at half res (clamped)
    glowW = Math.max(1, (w / 2) | 0);
    glowH = Math.max(1, (h / 2) | 0);

    trailA?.destroy();
    trailB?.destroy();
    glowTex?.destroy();

    trailA = makeTarget(w, h);
    trailB = makeTarget(w, h);
    glowTex = makeTarget(glowW, glowH);

    // Reset trail ping to avoid reading destroyed textures
    trailPing = true;

    // Clear both trail targets once to avoid undefined contents
    const encoder = device.createCommandEncoder();

    for (const t of [trailA, trailB]) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: t.createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
  }

  function getTrailSrcDst() {
    // Ping-pong between textures for decay (source) and accumulation (destination)
    const src = trailPing ? trailA! : trailB!;
    const dst = trailPing ? trailB! : trailA!;
    return { src, dst };
  }

  // Post bind groups depend on textures, so recreate each frame if targets changed.
  // We keep them cached per (src,dst).
  let postBG_cacheKey = "";
  let postBG: GPUBindGroup | null = null;
  let postBG_forPresent_cacheKey = "";
  let postBG_forPresent: GPUBindGroup | null = null;
  let postBG_forGlow_cacheKey = "";
  let postBG_forGlow: GPUBindGroup | null = null;

  function makePostBG(trailView: GPUTextureView, auxView: GPUTextureView) {
    return device.createBindGroup({
      layout: postBGL,
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: trailView },
        // binding(2) exists to keep a single post bind group layout across post passes.
        // It is *not* the same as the render target for any given pass.
        { binding: 2, resource: auxView },
        { binding: 3, resource: { buffer: postParamsBuf } },
      ],
    });
  }

  // --- State ---
  let pingAB = true;
  let lastMs = 0;
  let timeS = 0;
  let paramsLastDt = 0;
  let presetId = 0;

  // D-0008: profile switching (hero/stress)
  let clearTrailsNext = false;

  // D-0007: screenshot capture (one at a time)
  type CapturePending = {
    resolve: (cap: LifelabCapture) => void;
    reject: (err: any) => void;
  };
  let capturePending: CapturePending | null = null;
  let captureInFlight = false;

  function reseedForProfile(p: "hero" | "stress") {
    const seedMix = p === "hero" ? 0x11111111 : 0x22222222;
    device.queue.writeBuffer(
      particlesA,
      0,
      seedParticles(maxParticles, speciesCount, (seed ^ seedMix) >>> 0)
    );
    device.queue.writeBuffer(
      particlesB,
      0,
      seedParticles(maxParticles, speciesCount, ((seed ^ 0xa5a5a5a5) ^ seedMix) >>> 0)
    );
    pingAB = true;
    clearTrailsNext = true;
    lastMs = 0;
    timeS = 0;
  }

  function setProfile(p: "hero" | "stress") {
    profile = p;
    activeParticles = p === "hero" ? heroParticles : stressParticles;
    reseedForProfile(p);
  }

  function getProfile() {
    return profile;
  }

  async function requestCapture(): Promise<LifelabCapture> {
    if (captureInFlight) {
      // keep it fail-closed but non-fatal: reject additional capture requests until resolved
      return Promise.reject(new Error("Capture already in progress"));
    }
    captureInFlight = true;
    return new Promise<LifelabCapture>((resolve, reject) => {
      capturePending = { resolve, reject };
    });
  }

  // Apply initial preset
  function applyPreset(id: number) {
    presetId = Math.max(0, Math.min(PRESETS.length - 1, id));
    device.queue.writeBuffer(interactionBuf, 0, createInteractionMatrix(seed, presetId));
    device.queue.writeBuffer(paletteBuf, 0, makePalette(speciesCount, presetId));
    // post params also updated in updatePostParams()
    updatePostParams();
  }

  function updatePostParams() {
    ensureTargets();
    const p = PRESETS[presetId] ?? PRESETS[0]!;
    device.queue.writeBuffer(
      postParamsBuf,
      0,
      packPostParams({
        resX: targetW,
        resY: targetH,
        glowResX: glowW,
        glowResY: glowH,
        trailDecay: p.trailDecay,
        exposure: p.exposure,
        glowStrength: p.glowStrength,
      })
    );

    // Invalidate cached bind groups (textures might have changed)
    postBG_cacheKey = "";
    postBG_forGlow_cacheKey = "";
    postBG_forPresent_cacheKey = "";
  }

  applyPreset(0);

  function updateParams(nowMs: number) {
    ensureTargets();

    if (lastMs === 0) lastMs = nowMs;
    const dtMs = Math.max(0, Math.min(50, nowMs - lastMs));
    lastMs = nowMs;

    const dt = Math.max(1 / 240, Math.min(1 / 30, dtMs / 1000));
    paramsLastDt = dt;
    timeS += dt;

    device.queue.writeBuffer(
      paramsBuf,
      0,
      packParams({
        resX: targetW,
        resY: targetH,
        time: timeS,
        dt,
        numParticles: activeParticles,
        speciesCount,
        gridDim,
        cellCap,
      })
    );
  }

  function stepAndRender(nowMs: number) {
    const tTotal0 = performance.now();
    updateParams(nowMs);
    const tParams1 = performance.now();

    const simBG = pingAB ? simBG_AB : simBG_BA;
    const rBG = pingAB ? renderBG_B : renderBG_A;

    const { src: trailSrc, dst: trailDst } = getTrailSrcDst();
    const trailSrcView = trailSrc.createView();
    const trailDstView = trailDst.createView();
    const glowView = glowTex!.createView();

    // Cache post bind groups
    const decayKey = `decay:${trailSrc.label ?? ""}:${trailPing}:${targetW}x${targetH}`;
    if (!postBG || postBG_cacheKey !== decayKey) {
      postBG_cacheKey = decayKey;
      postBG = makePostBG(trailSrcView, trailSrcView);
    }

    const glowKey = `glow:${trailPing}:${targetW}x${targetH}->${glowW}x${glowH}`;
    if (!postBG_forGlow || postBG_forGlow_cacheKey !== glowKey) {
      postBG_forGlow_cacheKey = glowKey;
      postBG_forGlow = makePostBG(trailDstView, trailDstView);
    }

    const presentKey = `present:${trailPing}:${targetW}x${targetH}->swap`;
    if (!postBG_forPresent || postBG_forPresent_cacheKey !== presentKey) {
      postBG_forPresent_cacheKey = presentKey;
      postBG_forPresent = makePostBG(trailDstView, glowView);
    }

    const encoder = device.createCommandEncoder();

    // D-0008: on profile switches, clear trail history once.
    if (clearTrailsNext) {
      clearTrailsNext = false;
      for (const t of [trailA!, trailB!]) {
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: t.createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        pass.end();
      }
      trailPing = true;
    }

    // Compute: clear -> build grid -> simulate
    {
      const pass = encoder.beginComputePass();
      pass.setBindGroup(0, simBG);

      pass.setPipeline(csClear);
      pass.dispatchWorkgroups(Math.ceil(cellCount / 256));

      pass.setPipeline(csBuild);
      pass.dispatchWorkgroups(Math.ceil(activeParticles / 256));

      pass.setPipeline(csSim);
      pass.dispatchWorkgroups(Math.ceil(activeParticles / 256));

      pass.end();
    }
    const tCompute1 = performance.now();

    // D-0005: Trails
    // Pass 1: decay previous trailSrc into trailDst
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: trailDstView,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      pass.setPipeline(decayPipeline);
      pass.setBindGroup(2, postBG!);
      pass.draw(3);
      pass.end();
    }

    // Pass 2: draw particles additively onto trailDst (accumulate ink)
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: trailDstView,
            loadOp: "load",
            storeOp: "store",
          },
        ],
      });

      pass.setPipeline(particlePipeline);
      pass.setBindGroup(1, rBG);
      pass.draw(activeParticles * 6);
      pass.end();
    }
    const tTrails2 = performance.now();

    // D-0006: Glow (downsample + blur) into glowTex
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: glowView,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      pass.setPipeline(glowPipeline);
      pass.setBindGroup(2, postBG_forGlow!);
      pass.draw(3);
      pass.end();
    }
    const tGlow3 = performance.now();

    // Present: composite trail + glow to swapchain
    {
      const currentTex = context.getCurrentTexture();
      const view = currentTex.createView();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view,
            clearValue: { r: 0.02, g: 0.02, b: 0.03, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      pass.setPipeline(presentPipeline);
      pass.setBindGroup(2, postBG_forPresent!);
      pass.draw(3);
      pass.end();

      // D-0007: If a capture is pending, copy the swapchain texture to a mapped buffer.
      if (capturePending) {
        const w = targetW;
        const h = targetH;
        const bytesPerPixel = 4;
        const unpadded = w * bytesPerPixel;
        const bytesPerRow = Math.ceil(unpadded / 256) * 256;
        const size = bytesPerRow * h;

        const readback = device.createBuffer({
          size,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        encoder.copyTextureToBuffer(
          { texture: currentTex },
          { buffer: readback, bytesPerRow, rowsPerImage: h },
          { width: w, height: h }
        );

        const pending = capturePending;
        capturePending = null;

        // Finish+submit now; after submit, map and resolve.
        const tBeforeSubmit = performance.now();
        device.queue.submit([encoder.finish()]);
        const tAfterSubmit = performance.now();

        readback
          .mapAsync(GPUMapMode.READ)
          .then(() => {
            const mapped = new Uint8Array(readback.getMappedRange());
            const out = new Uint8ClampedArray(w * h * 4);
            for (let y = 0; y < h; y++) {
              const srcOff = y * bytesPerRow;
              const dstOff = y * unpadded;
              out.set(mapped.subarray(srcOff, srcOff + unpadded), dstOff);
            }
            readback.unmap();
            readback.destroy();
            captureInFlight = false;
            pending.resolve({ w, h, rgba: out });
          })
          .catch((err) => {
            try {
              readback.destroy();
            } catch {}
            captureInFlight = false;
            pending.reject(err);
          });

        // We returned early; stats for this frame will be computed with capture timing below.
        const p = PRESETS[presetId] ?? PRESETS[0]!;
        const hud = `Preset: ${p.name} · Profile ${profile} · Particles ${activeParticles.toLocaleString()} · Species ${speciesCount} · ${targetW}×${targetH}`;
        const stats: LifelabStats = {
          presetId,
          presetName: p.name,
          profile,
          particles: activeParticles,
          species: speciesCount,
          res: { w: targetW, h: targetH },
          dt: paramsLastDt,
          cpuMs: {
            params: tParams1 - tTotal0,
            compute: tCompute1 - tParams1,
            trails: tTrails2 - tCompute1,
            glow: tGlow3 - tTrails2,
            present: (tBeforeSubmit - tGlow3),
            capture: (tAfterSubmit - tBeforeSubmit),
            submit: 0,
            total: tAfterSubmit - tTotal0,
          },
        };
        return { hud, stats };
      }

    }

    const tPresent4 = performance.now();

    device.queue.submit([encoder.finish()]);
    const tSubmit5 = performance.now();

    // Flip
    pingAB = !pingAB;
    trailPing = !trailPing;

    const p = PRESETS[presetId] ?? PRESETS[0]!;
    const hud = `Preset: ${p.name} · Profile ${profile} · Particles ${activeParticles.toLocaleString()} · Species ${speciesCount} · ${targetW}×${targetH}`;
    const stats: LifelabStats = {
      presetId,
      presetName: p.name,
      profile,
      particles: activeParticles,
      species: speciesCount,
      res: { w: targetW, h: targetH },
      dt: paramsLastDt,
      cpuMs: {
        params: tParams1 - tTotal0,
        compute: tCompute1 - tParams1,
        trails: tTrails2 - tCompute1,
        glow: tGlow3 - tTrails2,
        present: tPresent4 - tGlow3,
        capture: 0,
        submit: tSubmit5 - tPresent4,
        total: tSubmit5 - tTotal0,
      },
    };

    return { hud, stats };
  }

  function setPreset(id: number) {
    applyPreset(id);
  }

  function getPresets() {
    return PRESETS.map((p) => ({ id: p.id, name: p.name }));
  }

  function getPreset() {
    return presetId;
  }

  function destroy() {
    particlesA.destroy();
    particlesB.destroy();
    paramsBuf.destroy();
    cellCountsBuf.destroy();
    cellSlotsBuf.destroy();
    interactionBuf.destroy();
    paletteBuf.destroy();
    postParamsBuf.destroy();
    trailA?.destroy();
    trailB?.destroy();
    glowTex?.destroy();
  }

  return { stepAndRender, requestCapture, setProfile, getProfile, setPreset, getPresets, getPreset, destroy };
}
