type Renderer = {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  pipeline: GPURenderPipeline;
};

const WGSL = /* wgsl */ `
struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  // Fullscreen triangle (no vertex buffer).
  var p = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );

  var uv = array<vec2f, 3>(
    vec2f(0.0, 0.0),
    vec2f(2.0, 0.0),
    vec2f(0.0, 2.0)
  );

  var out: VSOut;
  out.pos = vec4f(p[vid], 0.0, 1.0);
  out.uv = uv[vid];
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
  // Placeholder: subtle gradient + vignette.
  let uv = in.uv;
  let cx = uv.x - 0.5;
  let cy = uv.y - 0.5;
  let r2 = cx*cx + cy*cy;
  let vignette = 1.0 - smoothstep(0.15, 0.95, r2);

  let base = vec3f(0.02, 0.02, 0.05);
  let glow = vec3f(0.15, 0.12, 0.35) * vignette;
  return vec4f(base + glow, 1.0);
}
`;

export function createRenderer(args: {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}): Renderer {
  const { device, context, format } = args;

  const module = device.createShaderModule({ code: WGSL });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module,
      entryPoint: "vs_main",
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  return { device, context, format, pipeline };
}

export function renderFrame(renderer: Renderer) {
  const { device, context, pipeline } = renderer;

  const encoder = device.createCommandEncoder();
  const view = context.getCurrentTexture().createView();

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view,
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  pass.setPipeline(pipeline);
  pass.draw(3);
  pass.end();

  device.queue.submit([encoder.finish()]);
}
