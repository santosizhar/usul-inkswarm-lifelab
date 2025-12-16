import { LIFELAB_WGSL } from "./wgsl";

export type LifelabSim = {
  stepAndRender: (nowMs: number) => { hud: string };
  destroy: () => void;
};

const MAX_SPECIES = 10;

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

function makePalette(speciesCount: number): Float32Array {
  // RGBA in linear-ish space; alpha is used in the fragment for soft dots.
  const colors: number[][] = [
    [0.85, 0.30, 0.25, 1.0],
    [0.20, 0.70, 0.45, 1.0],
    [0.25, 0.45, 0.85, 1.0],
    [0.90, 0.75, 0.25, 1.0],
    [0.75, 0.25, 0.85, 1.0],
    [0.25, 0.85, 0.85, 1.0],
    [0.85, 0.55, 0.25, 1.0],
    [0.55, 0.85, 0.25, 1.0],
    [0.25, 0.55, 0.85, 1.0],
    [0.85, 0.25, 0.55, 1.0],
  ];

  const out = new Float32Array(MAX_SPECIES * 4);
  for (let i = 0; i < MAX_SPECIES; i++) {
    const c = colors[i % colors.length];
    out[i * 4 + 0] = c[0];
    out[i * 4 + 1] = c[1];
    out[i * 4 + 2] = c[2];
    out[i * 4 + 3] = i < speciesCount ? c[3] : 0.0;
  }
  return out;
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    // Numerical Recipes LCG
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function createInteractionMatrix(seed: number): Float32Array {
  const rand = lcg(seed ^ 0x9e3779b9);
  const mat = new Float32Array(MAX_SPECIES * MAX_SPECIES);
  for (let a = 0; a < MAX_SPECIES; a++) {
    for (let b = 0; b < MAX_SPECIES; b++) {
      // Diagonal: mild repulsion (avoid collapse); off-diagonal: mix.
      const base = a === b ? -0.30 : (rand() * 2 - 1) * 0.45;
      mat[a * MAX_SPECIES + b] = base;
    }
  }
  return mat;
}

function packParams(p: PackedParams): ArrayBuffer {
  // WGSL Params:
  // res: vec2f (8)
  // time: f32 (4)
  // dt: f32 (4)
  // numParticles: u32 (4)
  // speciesCount: u32 (4)
  // gridDim: u32 (4)
  // cellCap: u32 (4)
  // Total = 32 bytes
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

function seedParticles(num: number, speciesCount: number, seed: number): ArrayBuffer {
  // Particle stride = 32 bytes (see WGSL)
  const stride = 32;
  const buf = new ArrayBuffer(num * stride);
  const dv = new DataView(buf);

  const rand = lcg(seed);
  for (let i = 0; i < num; i++) {
    const o = i * stride;

    // pos in [0,1], slightly clustered around center
    const r1 = rand();
    const r2 = rand();
    const angle = r1 * Math.PI * 2;
    const radius = Math.pow(r2, 0.65) * 0.35;
    const px = 0.5 + Math.cos(angle) * radius;
    const py = 0.5 + Math.sin(angle) * radius;

    // vel small random
    const vx = (rand() * 2 - 1) * 0.15;
    const vy = (rand() * 2 - 1) * 0.15;

    const energy = rand() * 0.6;
    const size = 1.8 + energy * 2.5;

    const sp = (Math.floor(rand() * speciesCount) >>> 0) % MAX_SPECIES;

    dv.setFloat32(o + 0, px, true);
    dv.setFloat32(o + 4, py, true);
    dv.setFloat32(o + 8, vx, true);
    dv.setFloat32(o + 12, vy, true);
    dv.setFloat32(o + 16, energy, true);
    dv.setFloat32(o + 20, size, true);
    dv.setUint32(o + 24, sp, true);
    dv.setUint32(o + 28, 0, true);
  }
  return buf;
}

function createModule(device: GPUDevice): GPUShaderModule {
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
  const {
    device,
    context,
    format,
    canvas,
    seed = 1337,
    numParticles = 20000,
    speciesCount = 6,
  } = args;

  const gridDim = 128;
  const cellCap = 16;

  const module = createModule(device);

  // --- Buffers ---
  const particleStride = 32;
  const particleBytes = numParticles * particleStride;

  const particlesA = device.createBuffer({
    size: particleBytes,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  const particlesB = device.createBuffer({
    size: particleBytes,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });

  const paramsBuf = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cellCount = gridDim * gridDim;
  const cellCountsBuf = device.createBuffer({
    size: cellCount * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
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

  // Seed initial data (D-0003)
  device.queue.writeBuffer(particlesA, 0, seedParticles(numParticles, speciesCount, seed));
  device.queue.writeBuffer(interactionBuf, 0, createInteractionMatrix(seed));
  device.queue.writeBuffer(paletteBuf, 0, makePalette(speciesCount));

  // Shared bind group layout for compute passes.
  const simBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
    ],
  });

  const simPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [simBGL] });

  const csClear = device.createComputePipeline({
    layout: simPipelineLayout,
    compute: { module, entryPoint: "cs_clearCounts" },
  });
  const csBuild = device.createComputePipeline({
    layout: simPipelineLayout,
    compute: { module, entryPoint: "cs_buildGrid" },
  });
  const csSim = device.createComputePipeline({
    layout: simPipelineLayout,
    compute: { module, entryPoint: "cs_simulate" },
  });

  // Render pipeline
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });
  const renderPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [renderBGL],
  });

  const renderPipeline = device.createRenderPipeline({
    layout: renderPipelineLayout,
    vertex: { module, entryPoint: "vs_particles" },
    fragment: {
      module,
      entryPoint: "fs_particles",
      targets: [
        {
          format,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list", cullMode: "none" },
  });
// Persistent bind groups (CR-0002 perf fix): avoid per-frame bind group allocation.
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

let pingAB = true;
  let lastMs = performance.now();
  let t = 0;

  function updateParams(nowMs: number) {
    const dt = Math.min(1 / 30, Math.max(1 / 240, (nowMs - lastMs) / 1000));
    lastMs = nowMs;
    t += dt;

    const p = packParams({
      resX: canvas.width,
      resY: canvas.height,
      time: t,
      dt,
      numParticles,
      speciesCount,
      gridDim,
      cellCap,
    });
    device.queue.writeBuffer(paramsBuf, 0, p);
  }

  function stepAndRender(nowMs: number) {
    updateParams(nowMs);    const simBG = pingAB ? simBG_AB : simBG_BA;
    const rBG = pingAB ? renderBG_B : renderBG_A;

    const encoder = device.createCommandEncoder();

    // Compute: clear -> build grid -> simulate
    {
      const pass = encoder.beginComputePass();
      pass.setBindGroup(0, simBG);

      pass.setPipeline(csClear);
      pass.dispatchWorkgroups(Math.ceil((cellCount) / 256));

      pass.setPipeline(csBuild);
      pass.dispatchWorkgroups(Math.ceil(numParticles / 256));

      pass.setPipeline(csSim);
      pass.dispatchWorkgroups(Math.ceil(numParticles / 256));

      pass.end();
    }

    // Render
    {
      const view = context.getCurrentTexture().createView();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view,
            clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1.0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, rBG);
      pass.draw(numParticles * 6);
      pass.end();
    }

    device.queue.submit([encoder.finish()]);

    pingAB = !pingAB;

    return {
      hud: `Seed ${seed} · N ${numParticles} · Species ${speciesCount} · Grid ${gridDim}×${gridDim} cap ${cellCap}`,
    };
  }

  function destroy() {
    particlesA.destroy();
    particlesB.destroy();
    paramsBuf.destroy();
    cellCountsBuf.destroy();
    cellSlotsBuf.destroy();
    interactionBuf.destroy();
    paletteBuf.destroy();
  }

  return { stepAndRender, destroy };
}
