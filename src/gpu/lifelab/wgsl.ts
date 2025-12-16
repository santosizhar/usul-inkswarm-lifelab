export const LIFELAB_WGSL = /* wgsl */ `
// Inkswarm LifeLab — D-0003/D-0004 core WGSL
// Note: Uses storage buffers for particles + grid bins. WebGPU-only.

struct Params {
  res: vec2f,
  time: f32,
  dt: f32,
  numParticles: u32,
  speciesCount: u32,
  gridDim: u32,
  cellCap: u32,
};

struct Particle {
  pos: vec2f,
  vel: vec2f,
  energy: f32,
  size: f32,
  species: u32,
  _pad: u32,
};

@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(2) var<uniform> params: Params;
@group(0) @binding(3) var<storage, read_write> cellCounts: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> cellSlots: array<u32>;
@group(0) @binding(5) var<storage, read> interaction: array<f32>;

fn wrap01(x: f32) -> f32 {
  // WGSL doesn't have fract for negative the way we want; do explicit wrap.
  let y = x - floor(x);
  return y;
}

fn wrapPos(p: vec2f) -> vec2f {
  return vec2f(wrap01(p.x), wrap01(p.y));
}

fn toroidalDelta(a: vec2f, b: vec2f) -> vec2f {
  // returns b-a in [-0.5, 0.5] per axis (toroidal shortest vector)
  var d = b - a;
  if (d.x > 0.5) { d.x -= 1.0; }
  if (d.x < -0.5) { d.x += 1.0; }
  if (d.y > 0.5) { d.y -= 1.0; }
  if (d.y < -0.5) { d.y += 1.0; }
  return d;
}

fn cellIndex(pos: vec2f) -> u32 {
  let gd = f32(params.gridDim);
  var c = vec2u(clamp(vec2f(floor(pos * gd)), vec2f(0.0), vec2f(gd - 1.0)));
  return c.y * params.gridDim + c.x;
}

@compute @workgroup_size(256)
fn cs_clearCounts(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let cellCount = params.gridDim * params.gridDim;
  if (idx >= cellCount) { return; }
  atomicStore(&cellCounts[idx], 0u);
}

@compute @workgroup_size(256)
fn cs_buildGrid(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= params.numParticles) { return; }

  let p = particlesIn[i];
  let cell = cellIndex(p.pos);
  let slot = atomicAdd(&cellCounts[cell], 1u);

  if (slot < params.cellCap) {
    let base = cell * params.cellCap;
    cellSlots[base + slot] = i;
  }
}

// D-0003: a minimal integrator that produces motion even without interactions.
// D-0004: upgraded to neighbor forces using the grid.
@compute @workgroup_size(256)
fn cs_simulate(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= params.numParticles) { return; }

  var p = particlesIn[i];

  // --- Baseline drift (keeps the system alive even if interactions are mild)
  let center = vec2f(0.5, 0.5);
  let toC = center - p.pos;
  let curl = vec2f(-toC.y, toC.x);

  // --- Neighbor interactions (D-0004)
  let gd = i32(params.gridDim);
  let cell = vec2i(clamp(vec2f(floor(p.pos * f32(params.gridDim))), vec2f(0.0), vec2f(f32(params.gridDim - 1u))));
  var acc = vec2f(0.0);

  // Range tuning
  let cutoff = 0.08;
  let cutoff2 = cutoff * cutoff;
  let sigma = 0.03;
  let sigma2 = sigma * sigma;

  for (var oy = -1; oy <= 1; oy = oy + 1) {
    for (var ox = -1; ox <= 1; ox = ox + 1) {
      let nx = (cell.x + ox + gd) % gd;
      let ny = (cell.y + oy + gd) % gd;
      let ncell = u32(ny * gd + nx);

      let count = min(atomicLoad(&cellCounts[ncell]), params.cellCap);
      let base = ncell * params.cellCap;

      for (var k: u32 = 0u; k < count; k = k + 1u) {
        let j = cellSlots[base + k];
        if (j == i) { continue; }
        let q = particlesIn[j];

        let d = toroidalDelta(p.pos, q.pos);
        let r2 = dot(d, d);
        if (r2 > cutoff2) { continue; }

        let r = sqrt(max(r2, 1e-8));
        let dir = d / r;

        let sa = p.species;
        let sb = q.species;
        let idx = sa * 10u + sb; // MAX_SPECIES fixed at 10 on host
        let coeff = interaction[idx];

        // Gaussian attraction/repulsion + short-range hard repulsion.
        let w = exp(-r2 / sigma2);
        let hard = -0.015 / (r + 0.01);
        let f = coeff * w + hard;

        acc += dir * f;
      }
    }
  }

  // integrate
  let dt = params.dt;

  // mild curl drift (keeps motion coherent even if acc is tiny)
  acc += curl * 0.02;

  p.vel = p.vel + acc * dt;

  // stability clamps
  let vmax = 1.0;
  let spd = length(p.vel);
  if (spd > vmax) {
    p.vel = p.vel * (vmax / spd);
  }
  p.vel = p.vel * 0.995;

  p.pos = wrapPos(p.pos + p.vel * dt);

  // energy/size coupling (kept mild for stability)
  p.energy = clamp(p.energy * 0.995 + 0.002, 0.0, 1.0);
  p.size = clamp(1.8 + p.energy * 2.5, 1.0, 6.0);

  particlesOut[i] = p;
}

// --- Render shaders (instanced quad by vertex_index) ---
struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) species: u32,
  @location(2) energy: f32,
};

@group(1) @binding(0) var<storage, read> particlesR: array<Particle>;
@group(1) @binding(1) var<uniform> paramsR: Params;
@group(1) @binding(2) var<uniform> palette: array<vec4f, 10>; // MAX_SPECIES=10

fn quadCorner(vid: u32) -> vec2f {
  // 6 vertices (2 triangles)
  // ( -1,-1 ) ( 1,-1 ) ( 1, 1 ) ( -1,-1 ) ( 1, 1 ) ( -1, 1 )
  switch (vid) {
    case 0u: { return vec2f(-1.0, -1.0); }
    case 1u: { return vec2f( 1.0, -1.0); }
    case 2u: { return vec2f( 1.0,  1.0); }
    case 3u: { return vec2f(-1.0, -1.0); }
    case 4u: { return vec2f( 1.0,  1.0); }
    default: { return vec2f(-1.0,  1.0); }
  }
}

fn quadUV(vid: u32) -> vec2f {
  let c = quadCorner(vid);
  return c * 0.5 + vec2f(0.5);
}

@vertex
fn vs_particles(@builtin(vertex_index) vertexIndex: u32) -> VSOut {
  let pid = vertexIndex / 6u;
  let vid = vertexIndex % 6u;

  var out: VSOut;

  let p = particlesR[pid];
  let corner = quadCorner(vid);

  // convert particle pos in [0,1] to clip [-1,1]
  let clipCenter = p.pos * 2.0 - vec2f(1.0, 1.0);

  // size in pixels -> clip delta
  let px = p.size; // size field is px-ish
  let d = (corner * px) / paramsR.res * 2.0;

  out.pos = vec4f(clipCenter + d, 0.0, 1.0);
  out.uv = quadUV(vid);
  out.species = p.species;
  out.energy = p.energy;
  return out;
}

@fragment
fn fs_particles(in: VSOut) -> @location(0) vec4f {
  // Soft circle falloff
  let d = in.uv - vec2f(0.5, 0.5);
  let r2 = dot(d, d);
  let alpha = smoothstep(0.25, 0.0, r2); // 0 at edge, 1 at center

  let col = palette[in.species % 10u];
  // energy slightly brightens
  let glow = 0.65 + 0.35 * in.energy;

  return vec4f(col.rgb * glow, alpha * col.a);
}


// --- Postprocess (D-0005/D-0006): trails + glow + present ---
struct PostParams {
  res: vec2f,
  glowRes: vec2f,
  trailDecay: f32,
  exposure: f32,
  glowStrength: f32,
  _pad: f32,
};

struct FSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@group(2) @binding(0) var postSampler: sampler;
@group(2) @binding(1) var trailTex: texture_2d<f32>;
@group(2) @binding(2) var glowTex: texture_2d<f32>;
@group(2) @binding(3) var<uniform> post: PostParams;

@vertex
fn vs_fullscreen(@builtin(vertex_index) vid: u32) -> FSOut {
  // Fullscreen triangle
  var out: FSOut;

  var p = vec2f(0.0, 0.0);
  if (vid == 0u) { p = vec2f(-1.0, -1.0); }
  if (vid == 1u) { p = vec2f( 3.0, -1.0); }
  if (vid == 2u) { p = vec2f(-1.0,  3.0); }

  out.pos = vec4f(p, 0.0, 1.0);
  out.uv = (p + vec2f(1.0)) * 0.5;
  return out;
}

fn tonemap(x: vec3f) -> vec3f {
  // simple filmic-ish curve
  let y = 1.0 - exp(-x * post.exposure);
  return y;
}

@fragment
fn fs_decay(in: FSOut) -> @location(0) vec4f {
  // NOTE: We intentionally touch glowTex so all post passes share the same bind group layout.
  let _unused = textureSample(glowTex, postSampler, vec2f(0.5, 0.5)).rgb;
  let c = textureSample(trailTex, postSampler, in.uv);
  // Multiply by decay < 1 to let trails fade like ink on paper.
  return vec4f(c.rgb * post.trailDecay, 1.0);
}

@fragment
fn fs_glow(in: FSOut) -> @location(0) vec4f {
  // NOTE: We intentionally touch glowTex so all post passes share the same bind group layout.
  let _unused = textureSample(glowTex, postSampler, vec2f(0.5, 0.5)).rgb;
  // Cheap blur + implicit downsample (output surface is glowRes).
  let uv = in.uv;

  // 9 taps, fixed offsets in UV space relative to main resolution
  let px = vec2f(1.0) / post.res;
  var acc = vec3f(0.0);
  acc += textureSample(trailTex, postSampler, uv).rgb * 0.28;
  acc += textureSample(trailTex, postSampler, uv + vec2f( 1.0, 0.0) * px).rgb * 0.12;
  acc += textureSample(trailTex, postSampler, uv + vec2f(-1.0, 0.0) * px).rgb * 0.12;
  acc += textureSample(trailTex, postSampler, uv + vec2f(0.0,  1.0) * px).rgb * 0.12;
  acc += textureSample(trailTex, postSampler, uv + vec2f(0.0, -1.0) * px).rgb * 0.12;
  acc += textureSample(trailTex, postSampler, uv + vec2f( 1.0,  1.0) * px).rgb * 0.06;
  acc += textureSample(trailTex, postSampler, uv + vec2f(-1.0,  1.0) * px).rgb * 0.06;
  acc += textureSample(trailTex, postSampler, uv + vec2f( 1.0, -1.0) * px).rgb * 0.06;
  acc += textureSample(trailTex, postSampler, uv + vec2f(-1.0, -1.0) * px).rgb * 0.06;

  // Slightly emphasize brighter parts
  let boosted = acc * acc;
  return vec4f(boosted, 1.0);
}

@fragment
fn fs_present(in: FSOut) -> @location(0) vec4f {
  let base = textureSample(trailTex, postSampler, in.uv).rgb;
  let g = textureSample(glowTex, postSampler, in.uv).rgb * post.glowStrength;

  let c = tonemap(base + g);

  // Gamma to display
  let gamma = 1.0 / 2.2;
  let out = pow(c, vec3f(gamma));

  return vec4f(out, 1.0);
}

`;
